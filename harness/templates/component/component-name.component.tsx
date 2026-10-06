// Copy the folder to src/components/<feature>/<name>/ and rename
// "component-name" / "ComponentName" consistently (file names, CSS class, export).
import { useState } from "react";

import "./component-name.css";

export interface ComponentNameProps {
  title: string;
  onAction?: (value: number) => void;
}

export function ComponentName({ title, onAction }: ComponentNameProps) {
  // state
  const [count, setCount] = useState(0);

  // handlers
  const handleClick = () => {
    const next = count + 1;
    setCount(next);
    onAction?.(next);
  };

  // render
  return (
    <div className="component-name">
      <span className="component-name__title">{title}</span>
      <button className="component-name__button" onClick={handleClick}>
        {count}
      </button>
    </div>
  );
}
