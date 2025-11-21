import type { ChatMessage } from "@/types/chatMessage";
import { useState, useEffect, useRef } from "react";
import { Image } from "@imagekit/next";
import SyntaxHighlighter from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import Markdown from "react-markdown";

function LinkRenderer({
  href,
  children,
}: {
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <a className="text-blue-400 underline" href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

export default function Message({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming: boolean;
}) {
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
    setIsLoading(streaming);
  }, [streaming]);

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
              return (
                <Markdown
                  key={index}
                  components={{
                    a: (props) => <LinkRenderer href={props.href}>{props.children}</LinkRenderer>,
                    code: ({children, className, node, ...rest})=>{
                      const match = /language-(\w+)/.exec(className || '');
                      return match ? (
                        <SyntaxHighlighter language={match[1].trim()} style={a11yDark}>
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : ( <code className={className} {...rest}>{children}</code> );
                    }
                  }}
                >
                  {part.text}
                </Markdown>
              );
            case "tool-generateImage":
              switch (part.state) {
                case "input-streaming":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div className="text-sm text-zinc-500">
                        Receiving image generation request...
                      </div>
                      <pre className="text-xs text-zinc-600 mt-1">
                        {JSON.stringify(part.input, null, 2)}
                      </pre>
                    </div>
                  );

                case "input-available":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div className="text-sm text-zinc-400">
                        Generating image for: {part.input.prompt}
                      </div>
                    </div>
                  );

                case "output-available":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div>
                        <Image
                          urlEndpoint={
                            process.env.NEXT_PUBLIC_IMAGE_KIT_URL_ENDPOINT!
                          }
                          src={`${part.output}`}
                          alt="Generated image"
                          width={500}
                          height={500}
                        />
                      </div>
                    </div>
                  );

                case "output-error":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div className="text-sm text-red-400">
                        Error: {part.errorText}
                      </div>
                    </div>
                  );

                default:
                  return null;
              }
            case "tool-removeBackground":
              switch (part.state) {
                case "input-streaming":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div className="text-sm text-zinc-500">
                        Receiving image transformation request...
                      </div>
                      <pre className="text-xs text-zinc-600 mt-1">
                        {JSON.stringify(part.input, null, 2)}
                      </pre>
                    </div>
                  );

                case "input-available":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div className="text-sm text-zinc-400">
                        Removing background...
                      </div>
                    </div>
                  );

                case "output-available":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div>
                        <Image
                          urlEndpoint={
                            process.env.NEXT_PUBLIC_IMAGE_KIT_URL_ENDPOINT!
                          }
                          src={part.output}
                          alt="Generated image"
                          width={500}
                          height={500}
                        />
                      </div>
                    </div>
                  );

                case "output-error":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div className="text-sm text-red-400">
                        Error: {part.errorText}
                      </div>
                    </div>
                  );

                default:
                  return null;
              }
            case "tool-changeBackground":
              switch (part.state) {
                case "input-streaming":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div className="text-sm text-zinc-500">
                        Receiving image transformation request...
                      </div>
                      <pre className="text-xs text-zinc-600 mt-1">
                        {JSON.stringify(part.input, null, 2)}
                      </pre>
                    </div>
                  );

                case "input-available":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div className="text-sm text-zinc-400">
                        Changing background to: {part.input.background}
                      </div>
                    </div>
                  );

                case "output-available":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div>
                        <Image
                          urlEndpoint={
                            process.env.NEXT_PUBLIC_IMAGE_KIT_URL_ENDPOINT!
                          }
                          src={part.output}
                          alt="Generated image"
                          width={500}
                          height={500}
                        />
                      </div>
                    </div>
                  );

                case "output-error":
                  return (
                    <div
                      key={`${message.id}-getWeather-${index}`}
                      className="bg-zinc-800/50 border border-zinc-700 p-2 rounded mt-1 mb-2"
                    >
                      <div className="text-sm text-red-400">
                        Error: {part.errorText}
                      </div>
                    </div>
                  );

                default:
                  return null;
              }
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
