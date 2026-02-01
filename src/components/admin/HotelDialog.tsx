import { useState, useTransition, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createHotelAction,
  updateHotelAction,
  uploadHotelImageAction,
} from "@/app/actions/hotels";
import { InsertHotel, SelectHotel } from "@/lib/db-schema";
import { Pencil, Plus, Upload, Loader2, X } from "lucide-react";
import Image from "next/image";

interface HotelDialogProps {
  hotel?: SelectHotel;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function HotelDialog({
  hotel,
  trigger,
  open,
  onOpenChange,
}: HotelDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(hotel?.name || "");
  const [location, setLocation] = useState(hotel?.location || "");
  const [image, setImage] = useState(hotel?.image || "");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Controlled open state
  const isOpen = open !== undefined ? open : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const result = await uploadHotelImageAction(base64String, file.name);

        if (result.success && result.data) {
          setImage(result.data);
        } else {
          setError(result.error || "Failed to upload image");
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error processing file:", err);
      setError("Failed to process file");
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!location.trim()) {
      setError("Location is required");
      return;
    }

    startTransition(async () => {
      try {
        const hotelData: InsertHotel = {
          name,
          location,
          image: image?.trim() || null,
        };

        if (hotel) {
          await updateHotelAction(hotel.id, hotelData);
        } else {
          await createHotelAction(hotelData);
        }
        setOpen(false);
        // Reset form if creating
        if (!hotel) {
          setName("");
          setLocation("");
          setImage("");
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      } catch (err) {
        console.error("Failed to save hotel:", err);
        setError("Failed to save hotel. Please try again.");
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Hotel
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{hotel ? "Edit Hotel" : "Add New Hotel"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Grand Hotel"
              disabled={isPending || isUploading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="New York, NY"
              disabled={isPending || isUploading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="image">Image</Label>
            <div className="flex flex-col gap-2">
              {image && (
                <div className="relative w-full h-40 rounded-md overflow-hidden border">
                  <Image
                    src={image}
                    alt="Hotel preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImage("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending || isUploading}
                  className="w-full"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {isUploading ? "Uploading..." : "Upload Image"}
                </Button>
                <input
                  type="file"
                  id="image_upload"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={isPending || isUploading}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
