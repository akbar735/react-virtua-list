# ⚡ react-virtua-list

A **lightweight, fast, and modern React virtualization library** for rendering large lists efficiently.

Built with performance, simplicity, and developer experience in mind.

---

## 🚀 Features

* ⚡ **Blazing fast virtualization**
* 🧠 **Overscan support** for smooth scrolling
* 🎯 **scrollToIndex API** (imperative control)
* 🎨 **Flexible styling support**
* 🧩 **Hook-based architecture**
* 🔥 **isScrolling & isVisible optimizations**
* 📦 **Tiny bundle size**
* 💯 **TypeScript support out of the box**

---

## 📦 Installation

```bash
npm install react-virtua-list
```

or

```bash
yarn add react-virtua-list
```

---

## 🧑‍💻 Basic Usage

### TypeScript

```tsx
import { VirtualList } from "react-virtua-list";

function App() {
  return (
    <VirtualList
      height={500}
      itemCount={10000}
      itemHeight={50}
      renderItem={({ index, style }) => (
        <div style={style}>Item {index}</div>
      )}
    />
  );
}
```

### JavaScript

```jsx
import { VirtualList } from "react-virtua-list";

function App() {
  return (
    <VirtualList
      height={500}
      itemCount={10000}
      itemHeight={50}
      renderItem={({ index, style }) => (
        <div style={style}>Item {index}</div>
      )}
    />
  );
}
```

---

## 🎯 Advanced Usage

### scrollToIndex

#### TypeScript

```tsx
import { useRef } from "react";
import { VirtualList, VirtualListRef } from "react-virtua-list";

const listRef = useRef<VirtualListRef>(null);

<button onClick={() => listRef.current?.scrollToIndex(500)}>
  Go to Item 500
</button>

<VirtualList
  ref={listRef}
  height={500}
  itemCount={10000}
  itemHeight={50}
  renderItem={({ index, style }) => (
    <div style={style}>Item {index}</div>
  )}
/>
```

#### JavaScript

```jsx
import { useRef } from "react";
import { VirtualList } from "react-virtua-list";

function App() {
  const listRef = useRef(null);

  return (
    <>
      <button onClick={() => listRef.current?.scrollToIndex(500)}>
        Go to Item 500
      </button>

      <VirtualList
        ref={listRef}
        height={500}
        itemCount={10000}
        itemHeight={50}
        renderItem={({ index, style }) => (
          <div style={style}>Item {index}</div>
        )}
      />
    </>
  );
}
```

---

## 🧠 Smart Rendering

### Use `isScrolling` for performance

#### TypeScript

```tsx
renderItem={({ index, style, isScrolling }) => (
  <div style={style}>
    {isScrolling ? "Loading..." : `Item ${index}`}
  </div>
)}
```

#### JavaScript

```jsx
renderItem={({ index, style, isScrolling }) => (
  <div style={style}>
    {isScrolling ? "Loading..." : `Item ${index}`}
  </div>
)}
```

---

### Use `isVisible` for lazy rendering

#### TypeScript

```tsx
renderItem={({ index, style, isVisible }) => (
  <div style={style}>
    {isVisible ? <img src={`image-${index}.jpg`} alt="" /> : null}
  </div>
)}
```

#### JavaScript

```jsx
renderItem={({ index, style, isVisible }) => (
  <div style={style}>
    {isVisible ? <img src={`image-${index}.jpg`} alt="" /> : null}
  </div>
)}
```

---

## 🎨 Styling

You can style the list using props:

### TypeScript

```tsx
<VirtualList
  height={500}
  itemCount={1000}
  itemHeight={50}
  className="border rounded"
  itemClassName="px-4 py-2 hover:bg-gray-100"
  renderItem={({ index, style }) => (
    <div style={style}>Item {index}</div>
  )}
/>
```

### JavaScript

```jsx
<VirtualList
  height={500}
  itemCount={1000}
  itemHeight={50}
  className="border rounded"
  itemClassName="px-4 py-2 hover:bg-gray-100"
  renderItem={({ index, style }) => (
    <div style={style}>Item {index}</div>
  )}
/>
```

---

## ⚙️ API

### Props

| Prop         | Type       | Description                            |
| ------------ | ---------- | -------------------------------------- |
| `height`     | `number`   | Height of the container                |
| `itemCount`  | `number`   | Total number of items                  |
| `itemHeight` | `number`   | Height of each item                    |
| `overscan`   | `number`   | Extra items to render outside viewport |
| `renderItem` | `function` | Render function for items              |

---

### renderItem Props

```ts
{
  index: number;
  style: React.CSSProperties;
  isScrolling: boolean;
  isVisible: boolean;
}
```

---

### Ref API

```ts
scrollToIndex(index: number, options?: {
  align?: "start" | "center" | "end";
})
```

---

## 🧪 Example Use Cases

* 📜 Infinite feeds (Twitter, Instagram)
* 💬 Chat applications
* 📊 Large data tables
* 🧾 Logs viewer
* 🛒 Product lists

---

## 📈 Performance

* Renders only visible items
* Minimizes DOM nodes
* Smooth scrolling even with **10,000+ items**

---

## 🛠️ Roadmap

* [ ] Variable height virtualization
* [ ] Grid virtualization
* [ ] Horizontal mode
* [ ] Sticky headers

---

## 🤝 Contributing

Contributions are welcome! Feel free to open issues or submit PRs.

---

## 📄 License

MIT © Md Ali Akbar

---

## ⭐ Support

If you like this project, give it a ⭐ on GitHub!
