# 🌵 Cactus

Cactus is an interactive visual whiteboard designed to map out branching threads of ideas. Whether you're building roadmap, solving a complex math problem, or outlining a research plan, Cactus lets you structure your thoughts as expandable timelines with a clean, minimal interface.

## 🚀 Features

* Clickable nodes representing threads, trunks, and branches
* Expandable and collapsible sub-branches
* Support for recursive structure and unlimited depth
* In-memory and JSON-based local saving for quick iteration
* Designed for visualizing AI agent-generated plans or manual brainstorming

## 💠 Tech Stack

* Frontend: React + TypeScript + Vite
* Graph Rendering: React Flow
* Styling: TailwindCSS
* Data: Local JSON (moving to cloud DB later)

## 📂 Project Structure

```
/src
  ├── components      # UI components
  ├── graph           # Tree rendering logic
  ├── data            # In-memory and JSON data handlers
  └── App.tsx         # Main entry point
```

## 🧠 Usage

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## ✨ Coming Soon

* Cloud sync with Supabase or Firebase
* User authentication
* Real-time collaboration
* GPT-powered auto-expansion of threads

## 📄 License

MIT
