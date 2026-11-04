// Browser-side alerting for prototype testing (stands in for a voice call).

export function beep(volume = 0.3) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.2);
    });
  } catch {
    // audio unavailable; banner and notification still fire
  }
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported";
}

export async function requestNotifications() {
  if ("Notification" in window) await Notification.requestPermission();
  beep(0.01); // unlocks audio after a user gesture
  return notificationPermission();
}

export function raiseAlert(message: string, { sound, sticky }: { sound: boolean; sticky: boolean }) {
  if (sound) beep();
  if (notificationPermission() === "granted") {
    new Notification("Smart Dustbin Alert", { body: message, requireInteraction: sticky });
  }
}
