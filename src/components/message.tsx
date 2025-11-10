import type { UIMessage } from "ai";
import { useState, useEffect, useRef } from "react";
export default function Message({ message }: { message: UIMessage }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioUrlRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function handlePlayAudio() {
    if (audioUrlRef.current) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }
    if (isLoading) {
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch("/api/generate-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message.parts
            .map((part) => (part.type === "text" ? part.text : ""))
            .join(""),
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate speech");
      }
      const audioBlob = await response.blob();
      audioUrlRef.current = URL.createObjectURL(audioBlob);
      audioRef.current = new Audio(audioUrlRef.current);
      setIsPlaying(true);
      if (audioRef.current) {
        audioRef.current.play();
        audioRef.current.onended = () => {
          setIsPlaying(false);
          // URL.revokeObjectURL(audioUrlRef.current!);
        };
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        URL.revokeObjectURL(audioUrlRef.current!);
      }
    };
  }, []);

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
        <div
          className="flex items-center gap-2"
          title="Read Aloud"
          onClick={handlePlayAudio}
        >
          <i
            className={`fa-solid ${
              !audioUrlRef.current
                ? isLoading
                  ? "fa-spinner fa-spin"
                  : "fa-volume-high"
                : isPlaying
                ? "fa-pause"
                : "fa-play"
            }`}
          ></i>
        </div>
      )}
    </div>
  );
}
