<div align="center">

# 🧠 Déjà Vu

### *The memory that finds you before you ask.*

**An AI-powered desktop companion that quietly remembers everything you save—and reminds you at exactly the right moment.**

</div>

---

## ✨ Inspiration

We save useful information every day:

- A bug fix you'll need next week.
- A client's preference from a meeting.
- A useful command you found on Stack Overflow.
- An idea that felt important at 2 AM.

The problem isn't storing information.

The problem is **remembering that it exists.**

Search assumes you already know what you're looking for.

**Déjà Vu flips the model.**

Instead of waiting for you to search, it watches your context and surfaces the right memory when it becomes relevant.

> **You don't search. The memory finds you.**

---

# 🎥 Demo

Coming Soon

<!--
![Demo](assets/demo.gif)
-->

---

# 🚀 Features

### ⚡ Quick Capture

Save a thought in seconds using a lightweight popup.

No folders.

No organization.

Just think → save → continue working.

---

### 📋 Intelligent Clipboard Watcher

Déjà Vu quietly watches your clipboard.

Whenever you copy something—

- a person's name
- an error message
- a project
- a command
- a topic

—it checks whether you've already saved something related.

---

### 🧠 Semantic Memory Recall

Powered by **Supermemory**.

Instead of keyword search, Déjà Vu understands meaning.

Copy:

```
NullPointerException in UserService
```

Receive:

> "Remember to initialize repository before calling save()."

Even if those exact words never appeared.

---

### 🔔 Context-Aware Notifications

Only meaningful memories appear.

No spam.

No constant interruptions.

Just small moments of:

> "Oh yeah—I already knew this."

---

### 💻 Local-First

Your memories stay on your machine.

Déjà Vu works with **Supermemory Local**, giving you fast semantic search without depending on cloud services.

---

### 🎭 Adorable Mascot

Instead of generic desktop utilities...

Déjà Vu has a tiny companion that reacts to what it's doing.

| State | Meaning |
|--------|---------|
| 😌 Idle | Watching quietly |
| 👂 Listening | Clipboard changed |
| 💡 Recall | Memory found |
| 😕 No Match | Nothing relevant |
| ✍️ Saving | Capturing memory |
| ✅ Saved | Successfully stored |

---

# 🏗 Architecture

```text
                     Clipboard
                         │
                         ▼
              Clipboard Watcher
                         │
                         ▼
              Semantic Search Query
                         │
                         ▼
                Supermemory Engine
                         │
          Similarity Score ≥ Threshold?
                   │              │
                 Yes              No
                  │               │
                  ▼               ▼
       Native Notification     Ignore
                  │
                  ▼
        🎉 "The memory found you."
```

---

# 🛠 Tech Stack

| Technology | Purpose |
|------------|---------|
| Electron | Desktop application |
| TypeScript | Application logic |
| Supermemory | Semantic memory engine |
| Next.js | Optional web dashboard |
| Tailwind CSS | UI |
| Electron Builder | Desktop packaging |

---

# 🧩 How It Works

## Saving

```
Open popup
      ↓
Type thought
      ↓
Press Enter
      ↓
Stored in Supermemory
```

---

## Recall

```
Copy something
      ↓
Clipboard changes
      ↓
Semantic Search
      ↓
Similarity Score
      ↓
Above threshold?
      ↓
Notification
```

---

# 📂 Project Structure

```
deja-vu
│
├── electron-app
│   ├── main.ts
│   ├── preload.ts
│   ├── clipboard.ts
│   ├── notifications.ts
│   ├── supermemory.ts
│   └── assets
│
├── web-dashboard
│   ├── app
│   └── api
│
└── README.md
```

---

# ⚙️ Getting Started

## Clone

```bash
git clone https://github.com/Nakshatra05/deja-vu-memories.git

cd deja-vu-memories
```

---

## Install

```bash
npm install
```

---

## Start Supermemory Local

```bash
npx supermemory local
```

---

## Configure

Create a `.env`

```env
SUPERMEMORY_API_KEY=sm_local_xxxxxxxxx

SUPERMEMORY_API_URL=http://localhost:6767
```

---

## Run

```bash
npm start
```

---

# 🧪 Example

### Save

```
The Acme client prefers dark mode.
```

Later...

Copy:

```
Acme
```

Déjà Vu instantly reminds you:

> 💡 The Acme client prefers dark mode.

---

Save

```
Fix Redis timeout by increasing maxRetriesPerRequest.
```

Months later...

Copy:

```
Redis timeout
```

Déjà Vu surfaces the exact fix.

---

# 🎯 Use Cases

👨‍💻 Developers

- Bug fixes
- Terminal commands
- Deployment notes
- API quirks

---

💼 Professionals

- Client preferences
- Meeting notes
- Project context
- Follow-up reminders

---

🎓 Students

- Formulae
- Definitions
- Research notes
- Exam preparation

---

🧠 Anyone

Because good ideas shouldn't disappear.

---

# 🔮 Roadmap

- [ ] Real clipboard event listeners
- [ ] Image & screenshot memories
- [ ] OCR support
- [ ] Memory graph visualization
- [ ] Cross-device sync
- [ ] Smart threshold learning
- [ ] Voice notes
- [ ] Browser extension
- [ ] Mobile companion

---

# 🌟 Why Déjà Vu?

Search is passive.

Memory should be proactive.

The best assistant isn't the one that answers your questions.

It's the one that reminds you before you even ask them.

---

<div align="center">

# 🧠 Déjà Vu

### *The memory that finds you before you ask.*

**Built with ❤️ for people who think faster than they can remember.**

⭐ Star this repository if you like the idea!

</div>
