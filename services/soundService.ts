// services/soundService.ts

/**
 * A service to play simple, programmatically generated sound effects using the Web Audio API.
 * This avoids the need to load and manage audio files.
 * The service is designed as a singleton to use a single AudioContext.
 */

class SoundService {
  private audioContext: AudioContext | null = null;

  // Initialize the AudioContext. This should be done on the first user interaction.
  private init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Plays a sound based on the specified type.
   * @param type The type of sound to play.
   */
  public play(type: 'capture' | 'success' | 'log' | 'water' | 'click' | 'sent' | 'received' | 'start' | 'stop') {
    this.init();
    if (!this.audioContext) return;
    
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    let oscType: OscillatorType = 'sine';
    let frequency = 440;
    let duration = 0.1;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    
    switch (type) {
      case 'capture': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        gain.gain.setValueAtTime(1, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      
      case 'success': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.linearRampToValueAtTime(659.25, now + 0.1); // E5
        osc.frequency.linearRampToValueAtTime(783.99, now + 0.2); // G5
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }

      case 'log': {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
        osc.frequency.setValueAtTime(150, now);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'water': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
        osc.frequency.setValueAtTime(1000, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.15);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
        
      case 'click':
        frequency = 880;
        duration = 0.05;
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        break;
        
      case 'sent':
        frequency = 660;
        duration = 0.1;
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        break;

      case 'received':
        frequency = 780;
        duration = 0.1;
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        break;
        
      case 'start':
        frequency = 550;
        duration = 0.1;
        oscType = 'triangle';
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        break;
        
      case 'stop':
        frequency = 330;
        duration = 0.15;
        oscType = 'triangle';
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        break;
    }
    
    if (type !== 'capture' && type !== 'success' && type !== 'log' && type !== 'water') {
        const osc = ctx.createOscillator();
        osc.type = oscType;
        osc.frequency.setValueAtTime(frequency, now);
        osc.connect(gain);
        osc.start(now);
        osc.stop(now + duration);
    }
  }
}

// Export a singleton instance
export const soundService = new SoundService();
