"""Acceptance tests for the FastAPI backend (run: python test_app.py)."""
import unittest

from fastapi.testclient import TestClient

import app as srv


class DustbinApiTest(unittest.TestCase):
    def setUp(self):
        self.c = TestClient(srv.app)
        self.c.post('/api/reset')

    def post(self, body):
        return self.c.post('/api/update', json=body)

    def test_dashboard_served(self):
        r = self.c.get('/')
        self.assertEqual(r.status_code, 200)
        self.assertIn('Smart Dustbin', r.text)

    def test_history_and_age(self):
        srv.history.clear()
        self.post({'distance': 30, 'fill': 20})
        self.post({'distance': 20, 'fill': 57})
        h = self.c.get('/api/history').json()
        self.assertEqual([p['fill'] for p in h], [20, 57])
        s = self.c.get('/api/status').json()
        self.assertTrue(0 <= s['age'] < 5)

    def test_status_thresholds(self):
        for fill, expected in [(0, 'AVAILABLE'), (49, 'AVAILABLE'),
                               (50, 'ALMOST FULL'), (79, 'ALMOST FULL'),
                               (80, 'FULL - COLLECT NOW'), (100, 'FULL - COLLECT NOW')]:
            self.assertEqual(self.post({'distance': 20.04, 'fill': fill}).status_code, 200)
            s = self.c.get('/api/status').json()
            self.assertEqual((s['fill'], s['status'], s['distance']), (fill, expected, 20.0))

    def test_alert_flag_and_single_log(self):
        import io, contextlib
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            self.post({'distance': 30, 'fill': 20})
            self.assertFalse(self.c.get('/api/status').json()['alert'])
            self.post({'distance': 6, 'fill': 85})
            self.assertFalse(self.c.get('/api/status').json()['alert'])  # one reading is not enough
            self.post({'distance': 5, 'fill': 90})
            self.assertTrue(self.c.get('/api/status').json()['alert'])
            self.post({'distance': 38, 'fill': 5})
            self.assertFalse(self.c.get('/api/status').json()['alert'])
        self.assertEqual(buf.getvalue().count('*** ALERT'), 1)

    def test_heartbeat_tracks_device_health(self):
        hb = {'device_id': 'bin-01', 'ip': '10.0.0.5', 'rssi': -60, 'uptime_s': 42,
              'fw': '1.1.0', 'sensor_ok': False, 'sensor_failures': 7, 'echo_idle': 0}
        self.assertEqual(self.c.post('/api/heartbeat', json=hb).status_code, 200)
        d = self.c.get('/api/status').json()['device']
        self.assertTrue(d['online'])
        self.assertFalse(d['sensor_ok'])
        self.assertEqual((d['device_id'], d['rssi'], d['sensor_failures']), ('bin-01', -60, 7))
        # a successful reading marks the sensor healthy again
        self.post({'distance': 25, 'fill': 40, 'device_id': 'bin-01', 'rssi': -55})
        d = self.c.get('/api/device').json()
        self.assertTrue(d['sensor_ok'])
        self.assertEqual((d['sensor_failures'], d['rssi']), (0, -55))
        self.assertEqual(self.c.post('/api/heartbeat', json={'device_id': 'x'}).status_code, 422)

    def test_rejects_trigger_crosstalk(self):
        r = self.post({'distance': 0.3, 'fill': 100})
        self.assertEqual(r.status_code, 422)
        s = self.c.get('/api/status').json()
        self.assertEqual((s['status'], s['alert']), ('WAITING', False))

    def test_stale_reading_drops_alert(self):
        self.post({'distance': 5, 'fill': 95})
        self.post({'distance': 5, 'fill': 95})
        self.assertTrue(self.c.get('/api/status').json()['alert'])
        srv.latest['ts'] -= srv.READING_STALE_S + 1
        s = self.c.get('/api/status').json()
        self.assertEqual((s['status'], s['alert']), ('NO RECENT DATA', False))

    def test_reset_clears_alert(self):
        self.post({'distance': 5, 'fill': 95})
        self.post({'distance': 5, 'fill': 95})
        self.c.post('/api/reset')
        s = self.c.get('/api/status').json()
        self.assertEqual((s['alert'], s['ts'], len(self.c.get('/api/history').json())), (False, None, 0))

    def test_rejects_bad_input(self):
        self.assertEqual(self.post({'fill': 10}).status_code, 422)
        self.assertEqual(self.post({'distance': 'x', 'fill': 10}).status_code, 422)
        self.assertEqual(self.post({'distance': -1, 'fill': 10}).status_code, 422)
        self.assertEqual(self.post({'distance': 10, 'fill': 101}).status_code, 422)
        self.assertEqual(self.c.post('/api/update', content='junk').status_code, 422)


class ApiKeyTest(unittest.TestCase):
    """The voice/programmatic API is guarded by API_KEY when it is set; the
    dashboard endpoints stay open either way."""

    def setUp(self):
        self.c = TestClient(srv.app)

    def tearDown(self):
        srv.API_KEY = None

    def test_open_when_no_key_set(self):
        srv.API_KEY = None
        self.assertEqual(self.c.get('/api/status').status_code, 200)
        self.assertEqual(self.c.get('/api/voice/status').status_code, 200)

    def test_key_required_for_voice_when_set(self):
        srv.API_KEY = 'secret'
        self.assertEqual(self.c.get('/api/voice/status').status_code, 401)
        self.assertEqual(self.c.get('/api/voice/status', headers={'x-api-key': 'secret'}).status_code, 200)
        self.assertEqual(
            self.c.get('/api/voice/status', headers={'Authorization': 'Bearer secret'}).status_code, 200)
        # the stream endpoint is guarded too (401 returns before streaming starts)
        self.assertEqual(self.c.get('/api/voice/stream').status_code, 401)
        # dashboard data stays open regardless of the key
        self.assertEqual(self.c.get('/api/status').status_code, 200)


if __name__ == '__main__':
    unittest.main(verbosity=2)
