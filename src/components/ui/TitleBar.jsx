/**
 * TitleBar
 *
 * A draggable title strip shown at the very top of the Electron window.
 * On macOS the native traffic-light buttons sit in the left inset, so we
 * add left padding to avoid overlapping them. On Windows/Linux the native
 * frame is hidden by `titleBarStyle: 'hiddenInset'` so we render the app
 * title here instead.
 *
 * The `-webkit-app-region: drag` CSS makes the whole bar draggable as a
 * native title bar, while interactive children must opt out with `no-drag`.
 */
export default function TitleBar() {
  // window.electronAPI is injected by preload.js — undefined in a browser
  const isMac      = window.electronAPI?.platform === "darwin";
  const isElectron = Boolean(window.electronAPI);

  // Don't render at all when running in a normal browser (npm run dev without Electron)
  if (!isElectron) return null;

  return (
    <div
      style={{
        height:            32,
        background:        "#172f50",
        WebkitAppRegion:   "drag",    // whole bar is draggable
        display:           "flex",
        alignItems:        "center",
        justifyContent:    "center",
        paddingLeft:       isMac ? 78 : 12,  // leave room for macOS traffic lights
        paddingRight:      12,
        userSelect:        "none",
        flexShrink:        0,
      }}
    >
      <span
        style={{
          fontSize:      11,
          fontWeight:    600,
          color:         "#64748b",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Campus Equipment Loan
      </span>
    </div>
  );
}
