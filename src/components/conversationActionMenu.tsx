import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState } from "react"

export default function ConversationActionMenu({
  onDelete,
}: {
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DropdownMenu onOpenChange={setIsOpen}>
      <DropdownMenuTrigger 
        className={`outline-none focus:outline-none hover:bg-transparent focus:bg-transparent transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
        >
            <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            />
        </svg> 
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onDelete} className="text-red-400 cursor-pointer">
                Delete Conversation
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
    );
}  
