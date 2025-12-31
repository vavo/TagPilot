# **TagPilot v1.5 ✈️ (Your Co-Pilot for LoRA Dataset Domination)**

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20me%20a%20coffee-vavo-5F7FFF?style=for-the-badge&logo=buy-me-a-coffee&logoColor=white)](https://www.buymeacoffee.com/vavo)

**The browser-based beast that turns chaotic image piles into perfectly tagged, ready-to-train datasets – faster than you can say "trigger word activated!"**

![TagPilot UI](https://i.ibb.co/whbs8by3/tagpilot-gui.png)

Tired of wrestling with folders full of untagged images like a digital archaeologist? TagPilot swoops in like a supersonic jet, handling everything client-side so your precious data never leaves your machine (except when you politely ask Gemini to peek for tagging magic). Private, secure, and zero server drama.

### **Why TagPilot Will Make You Smile (and Your LoRAs Shine)**

- **Upload Shenanigans**: Drag in single pics, or drop a whole ZIP bomb – it even pairs existing .txt tags like a pro matchmaker. Add more anytime; no commitment issues here.
- **Trigger Word Superpower**: Type your magic word once (e.g., "ohwx woman") and watch it glue itself as the VIP first tag on *every* image. Boom – consistent activation guaranteed.
- **AI Tagging Turbo**: Powered by Gemini 1.5 Flash (free tier friendly!), Grok, OpenAI, DeepDanbooru, or WD1.4 – because why settle for one engine when you can have a fleet?
  - Batch modes: **Ignore** (I'm good, thanks), **Append** (more tags pls), or **Overwrite** (out with the old!).
  - Progress bar + emergency "Stop" button for when the API gets stage fright.
- **Tag Viewer Cockpit**: Collapsible dashboard showing every tag's popularity. Click the little × to yeet a bad tag from the *entire* dataset. Global cleanup has never felt so satisfying.
- **Per-Image Playground**: Clickable pills for tags, free-text captions, add/remove on the fly. Toggle between tag-mode and caption-mode like switching altitudes.
- **Crop & Conquer**: Free-form cropper (any aspect ratio) to frame your subjects perfectly. No more awkward compositions ruining your training.
- **Duplicate Radar**: 100% local hash detection – skips clones quietly, no false alarms from sneaky filename changes.
- **Export Glory**: One click → pristine ZIP with images + .txt files, ready for kohya_ss or your trainer of choice.
- **Privacy First**: Everything runs in your browser. API key stays local. No cloudy business.

### **Getting Airborne (Setup in 30 Seconds)**

No servers, no npm drama – just pure single-file HTML bliss.

1. Clone or download: `git clone https://github.com/vavo/TagPilot.git`
2. Open `tagpilot.html` in your browser. Done! 🚀

(Pro tip: For a fancy local server, run `python -m http.server 8000` and hit localhost:8000.)

### **Flight Plan (How to Crush It)**

1. **Load Cargo**: Upload images or ZIP – duplicates auto-skipped.
2. **Set Trigger**: Your secret activation phrase goes here.
3. **Name Your Mission**: Dataset prefix for clean exports.
4. **Tag/Caption All**: Pick model in Settings ⚙️, hit the button, tweak limits/mode/prompt.
5. **Fine-Tune**: Crop, manual edit, nuke bad tags globally.
6. **Deploy**: Export ZIP and watch your LoRA soar.

### **Under the Hood (Cool Tech Stuff)**

- Vanilla JS + Tailwind (fast & beautiful)
- JSZip for ZIP wizardry
- Cropper.js for precision framing
- Web Crypto for local duplicate detection
- Multiple AI backends (Gemini default, others one click away)

Got ideas, bugs, or want to contribute? Open an issue or PR – let's make dataset prep ridiculously awesome together!

**Happy training, pilots! ✈️**
