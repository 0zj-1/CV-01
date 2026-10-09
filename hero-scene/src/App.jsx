import { Component, useRef, useState, useEffect, useCallback } from "react";
import { Leva } from "leva";
import P01Scene from "./components/P01Scene";
import DebugControls from "./components/DebugControls";
import { projectFromLocation, getProject, projectCycle } from "./config/projectPresets";
import { handoff } from "./config/handoff";
import { prepareStudios } from "./config/studioPixels";
class SceneError extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? (
      <div className="error">
        Unable to start WebGL. {this.state.error.message}
        <button onClick={() => location.reload()}>Retry</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
const params = new URLSearchParams(location.search);
// Embed mode (website hero): geometry only, the three Parts cycling.
const embed = import.meta.env.MODE === "embed" || params.has("embed");
const embedBackground = params.get("bg") === "transparent" ? null : /^[0-9a-f]{6}$/i.test(params.get("bg") ?? "") ? `#${params.get("bg")}` : "#ededeb";

// ?wait (website hero): the host page's opening animation shares our main
// thread, so only download until the host sends `hero:start`; the WebGL
// start-up (compiles, model parsing) then happens after the opening.
const waitForHost = params.has("wait") && window.parent !== window;

function EmbeddedHero() {
  const [started, setStarted] = useState(!waitForHost);
  // While waiting, the studio environments are built in a worker so the
  // start itself does no heavy maths on the shared main thread.
  const [studiosReady, setStudiosReady] = useState(!waitForHost);
  useEffect(() => {
    if (waitForHost) prepareStudios(projectCycle).then(() => setStudiosReady(true));
  }, []);
  useEffect(() => {
    if (started) return;
    const onMessage = (event) => {
      if (event.origin === location.origin && event.data === "hero:start") setStarted(true);
    };
    window.addEventListener("message", onMessage);
    // Repeated until answered, so a host that is not listening yet still hears it.
    const ready = () => window.parent.postMessage("hero:ready", location.origin);
    ready();
    const id = setInterval(ready, 400);
    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(id);
    };
  }, [started]);
  const telemetry = useRef({ fps: 0, bodies: 0, collisions: 0, softResponses: 0, clickResponses: 0, maxDeviation: 0 });
  // Dev aid: ?start=p02 begins the cycle at another Part.
  const [index, setIndex] = useState(() => Math.max(0, projectCycle.indexOf(params.get("start"))));
  const [visible, setVisible] = useState(true);
  const root = useRef();
  // activation counts hand-overs; it restarts the newly active Part.
  const [activation, setActivation] = useState(0);
  const next = useCallback(() => {
    setIndex((i) => (i + 1) % projectCycle.length);
    setActivation((n) => n + 1);
  }, []);
  const at = (offset) => projectCycle[(index + offset + projectCycle.length) % projectCycle.length];
  useEffect(() => {
    document.body.style.background = embedBackground ?? "transparent";
    // Inside an iframe the implicit root is the top-level viewport, so this
    // pauses rendering once the hero is scrolled out of the page.
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return (
    <main className="embed" ref={root}>
      {started && studiosReady && (
      <SceneError>
        <P01Scene
          telemetry={telemetry}
          project={getProject(projectCycle[index])}
          cycle={projectCycle}
          nextProject={at(1)}
          previousProject={at(-1)}
          handoffIn={activation > 0}
          activation={activation}
          embed
          background={embedBackground}
          onCycle={next}
          paused={!visible}
        />
      </SceneError>
      )}
      <canvas className="handoff" ref={(el) => (handoff.overlay = el)} aria-hidden="true" />
      <Leva hidden />
    </main>
  );
}

export default function App() {
  return embed ? <EmbeddedHero /> : <Studio />;
}

function Studio() {
  const project = projectFromLocation();
  const telemetry = useRef({
    fps: 0,
    bodies: 0,
    collisions: 0,
    softResponses: 0,
    clickResponses: 0,
    maxDeviation: 0,
  });
  const [metrics, setMetrics] = useState(telemetry.current),
    [reset, setReset] = useState(0);
  useEffect(() => {
    document.title = `${project.label} · Material Studies`;
    const id = setInterval(() => setMetrics({ ...telemetry.current }), 1000);
    return () => clearInterval(id);
  }, [project, telemetry]);
  return (
    <main className={project.id}>
      <SceneError>
        <P01Scene key={`${project.id}-${reset}`} telemetry={telemetry} project={project} />
      </SceneError>
      <header>
        <span>JULIAN LIN / MATERIAL STUDIES</span>
        <span>{project.label}</span>
      </header>
      <div className="caption">
        <h1>
          {project.id === "p03" ? "Different materials" : project.id === "p02" ? "Stretching between" : "Softness creates"}
          <br />
          {project.id === "p03" ? "— a stronger me." : project.id === "p02" ? "reality and imagination." : "possibility."}
        </h1>
        <p>Drag any object. Release to let it settle.</p>
      </div>
      <footer>
        <span aria-live="off">
          {metrics.bodies} objects · {metrics.fps} fps · {metrics.collisions}{" "}
          contacts
        </span>
        <button
          onClick={() => {
            telemetry.current = {
              fps: 0,
              bodies: 0,
              collisions: 0,
              softResponses: 0,
              clickResponses: 0,
              maxDeviation: 0,
            };
            setReset((n) => n + 1);
          }}
        >
          Replay sequence ↗
        </button>
      </footer>
      <DebugControls project={project} />
      <output className="diagnostics" data-testid="physics-metrics">
        {JSON.stringify(metrics)}
      </output>
    </main>
  );
}
