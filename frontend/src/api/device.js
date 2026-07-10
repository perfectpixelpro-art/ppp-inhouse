// A real Mac reports maxTouchPoints === 0. A phone/tablet using Safari's
// "Request Desktop Website" sends a Mac user-agent but still reports touch —
// those must hand over a location, which the server stamps onto the day.
export const isTouchDevice = () => (navigator.maxTouchPoints || 0) > 0;

export const deviceKind = () => {
  if (!isTouchDevice()) return "Mac";
  const narrow = Math.min(screen.width, screen.height) < 700;
  return narrow ? "iPhone (desktop mode)" : "iPad (desktop mode)";
};

// One-shot GPS read. Rejects with a readable message the UI can show as-is.
export const getLocation = () =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("This device can't report a location."));
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          accuracy: Math.round(p.coords.accuracy),
        }),
      (err) =>
        reject(
          new Error(
            err.code === 1
              ? "Location permission denied — allow location to check in from this device."
              : "Couldn't get your location. Try again with a better signal."
          )
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
