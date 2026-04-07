import { deriveRuntimeStatus } from '../services/runtime/status';

describe('runtime status detection', () => {
  it('returns on when Woodfish Dark is active and payload is present', () => {
    const snapshot = deriveRuntimeStatus({
      activeTheme: 'Woodfish Dark',
      hasPayload: true,
      features: {
        syntaxGradient: true,
        glow: true,
        cursor: true,
      },
    });

    expect(snapshot.state).toBe('on');
    expect(snapshot.isWoodfishTheme).toBe(true);
    expect(snapshot.hasPayload).toBe(true);
  });

  it('returns paused when effects are enabled but the active theme is not Woodfish Dark', () => {
    const snapshot = deriveRuntimeStatus({
      activeTheme: 'One Dark Pro',
      hasPayload: false,
      features: {
        syntaxGradient: true,
        glow: false,
        cursor: true,
      },
    });

    expect(snapshot.state).toBe('paused');
    expect(snapshot.isWoodfishTheme).toBe(false);
    expect(snapshot.hasPayload).toBe(false);
  });

  it('returns off when Woodfish Dark stays selected but the payload has already been removed', () => {
    const snapshot = deriveRuntimeStatus({
      activeTheme: 'Woodfish Dark',
      hasPayload: false,
      features: {
        syntaxGradient: true,
        glow: true,
        cursor: true,
      },
    });

    expect(snapshot.state).toBe('off');
    expect(snapshot.isWoodfishTheme).toBe(true);
    expect(snapshot.hasPayload).toBe(false);
  });

  it('returns off when no payload is active and no visible effect layer is enabled', () => {
    const snapshot = deriveRuntimeStatus({
      activeTheme: 'One Dark Pro',
      hasPayload: false,
      features: {
        syntaxGradient: false,
        glow: false,
        cursor: false,
      },
    });

    expect(snapshot.state).toBe('off');
  });
});
