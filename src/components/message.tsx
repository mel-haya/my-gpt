import type { UIMessage } from "ai";
import { Button } from "./ui/button";
export default function Message({ message }: { message: UIMessage }) {
  return (
    <div
      key={message.id}
      className={`w-full p-4 flex flex-col gap-4 ${
        message.role === "user" ? "items-end" : "items-start"
      }`}
    >
      <div
        className={`px-4 py-2 max-w-[80%] rounded-lg font-jost text-lg ${
          message.role === "user"
            ? "bg-blue-500 text-white"
            : "bg-gray-200/5 text-white"
        }`}
      >
        {message.parts.map((part, index) => {
          switch (part.type) {
            case "text":
              return <div key={index}>{part.text}</div>;
            default:
              return null;
          }
        })}
      </div>
      {message.role === "assistant" && (
        <div className="flex items-center gap-2" title="Read Aloud">
          <i className="fa-solid fa-volume-high"></i>
        </div>
      )}
    </div>
  );
}
