import { SplendidGrandPiano } from "./smplr/dist/index.mjs";
const audio = new AudioContext();
const piano = new SplendidGrandPiano(audio);
const intervals = [
  {
    name: "m2",
    notes: [0, 1],
    spokenName: "Minor 2nd",
  },
  {
    name: "M2",
    notes: [0, 2],
    spokenName: "Major 2nd",
  },
  {
    name: "m3",
    notes: [0, 3],
    spokenName: "Minor 3rd",
  },
  {
    name: "M3",
    notes: [0, 4],
    spokenName: "Major 3rd",
  },
  {
    name: "p4",
    notes: [0, 5],
    spokenName: "Perfect 4th",
  },
  {
    name: "tt",
    notes: [0, 6],
    spokenName: "Try tone",
  },
  {
    name: "p5",
    notes: [0, 7],
    spokenName: "Perfect 5th",
  },
  {
    name: "m6",
    notes: [0, 8],
    spokenName: "Minor 6th",
  },
  {
    name: "M6",
    notes: [0, 9],
    spokenName: "Major 6th",
  },
  {
    name: "m7",
    notes: [0, 10],
    spokenName: "Minor 7th",
  },
  {
    name: "M7",
    notes: [0, 11],
    spokenName: "Major 7th",
  },
  {
    name: "o",
    notes: [0, 12],
    spokenName: "Octave",
  },
];
const chords = [
  {
    name: "",
    notes: [0, 4, 7],
    spokenName: "Major",
  },
  {
    name: "m",
    notes: [0, 3, 7],
    spokenName: "Minor",
  },
  {
    name: "dim",
    notes: [0, 3, 6],
    spokenName: "Diminished",
  },
  {
    name: "+",
    notes: [0, 4, 8],
    spokenName: "Augmented",
  },
  {
    name: "7",
    notes: [0, 4, 7, 10],
    spokenName: "Dominant 7th",
  },
  {
    name: "m7",
    notes: [0, 3, 7, 10],
    spokenName: "Minor 7th",
  },
  {
    name: "M7",
    notes: [0, 4, 7, 11],
    spokenName: "Major 7th",
  },
  {
    name: "mM7",
    notes: [0, 3, 7, 11],
    spokenName: "Minor major 7th",
  },
];


async function speak(message) {
  return new Promise(r => {
    var utter = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.speak(utter);
    utter.onend = r;
  });
}

async function sleep(duration) {
  return new Promise(r => setTimeout(r, duration))
}

async function playInterval(piano, key, notes) {
  const now = audio.currentTime;
  piano.start({ note: key + notes[0], time: now, duration: 0.3 });
  piano.start({ note: key + notes[1], time: now + 0.3, duration: 4.7 });
  await sleep(5000);
}

async function playArpeggio(piano, key, notes, duration) {
  const now = audio.currentTime;
  const increment = duration / notes.length;
  notes.forEach((note, i) => {
    piano.start({ note: key + note, time: now + i*increment, duration: increment });
  });
  await sleep(duration*1000 + 500);
}

async function playChord(piano, key, notes, duration) {
  for (const note of notes) {
    piano.start({ note: key + note, duration: duration });
  }
  await sleep(duration*1000);
}

async function intervalQuiz(piano, key, interval, harmonic) {
  let notes = [...interval.notes];
  const ascending = randomInt(0,1);
  if (!ascending) {
    notes.reverse();
  }
  console.log(`Playing interval ${interval.name}, ${ascending ? 'ascending' : 'descending'}: ${notes.map(x => x+key).map(noteName)}`);
  if (harmonic) {
    await playChord(piano, key, notes, 5);
  } else {
    await playInterval(piano, key, notes);
  }
  await speak(interval.spokenName);
}

async function chordQuiz(piano, key, chord, useInversions) {
  const inversion = useInversions ? randomInt(0, chord.notes.length-1) : 0;
  let notes = invertChord(chord.notes, inversion);

  console.log(`Playing ${noteName(key)}${chord.name}, inversion ${inversion}: ${notes.map(x => x+key).map(noteName)}`);
  await playChord(piano, key, notes, 1);
  await playArpeggio(piano, key, notes, notes.length * 0.5)
  await playChord(piano, key, notes, 3);
  await speak(chord.spokenName)
}

// returns a random integer in [floor, ceiling]
function randomInt(floor, ceiling) {
  if (ceiling < floor) return nan;
  return floor + Math.floor(Math.random() * (ceiling - floor + 1))
}
function randomKey() {
    // 48 is the C below middle C, 59 is the B below middle C. We'll stay with the 
    // key note in this octave.
    return randomInt(48,59);
}

function noteName(note) {
  const noteNames = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
  const index = note % 12;
  return noteNames[index];
}

const modeToItems = {
    'chords': chords,
    'harmonic': intervals,
    'melodic': intervals,
};

function makeQuizzer(mode, useInversions) {
  const splitMode = mode.split(":");
  const modeName = splitMode[0];
  const itemNames = new Set(splitMode[1].split(","));
  let quizFn;
  switch (splitMode[0]) {
    case 'harmonic':
      quizFn = async (piano, key, item) => { await intervalQuiz(piano, key, item, true); };
      break;
    case 'melodic':
      quizFn = async (piano, key, item) => { await intervalQuiz(piano, key, item, false); };
      break;
    case 'chords':
    default:
      quizFn = async (piano, key, item) => { await chordQuiz(piano, key, item, useInversions); };
      break;
  }

  let items = [...modeToItems[modeName]];
  if (!itemNames.has('*')) {
    items = items.filter((item) => itemNames.has(item.name));
  }
  return { items: items, quizFn: quizFn };
}

let playing = false;

document.getElementById("stop").onclick = async () => {
  playing = false;
}

document.getElementById("play").onclick = async () => {
  if (playing) return;
  playing = true;
  audio.resume(); // enable audio context after a user interaction
  // Request screen wake lock.  TODO: Apparently:
  //  - this will only work with https
  //  - we will need to detect visibility changes and re-request the screen lock.
  try {
    const wakeLock = await navigator.wakeLock.request("screen");
  } catch (err) {
    console.log(`${err.name}, ${err.message}`);
  }
  const useInversions = document.getElementById("inversions").checked;

  let quizzer = makeQuizzer(document.getElementById("mode").value);

  while (playing) {
    const item = quizzer.items[randomInt(0, quizzer.items.length-1)];
    await quizzer.quizFn(piano, randomKey(), item);
    await sleep(1000);
  }
};

function invertChord(notes, inversion) {
  let inverted = []
  for (let i = inversion; i < inversion + notes.length; ++i) {
    inverted.push(notes[i % notes.length] + 12 * Math.floor(i / notes.length));
  }
  return inverted;
}
