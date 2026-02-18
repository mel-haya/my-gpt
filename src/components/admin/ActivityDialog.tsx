"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectActivity, InsertActivity } from "@/lib/db-schema";
import { uploadImageAction } from "@/app/actions/activities";
import { ImagePlus, Loader2, X } from "lucide-react";
import Image from "next/image";

interface ActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: InsertActivity | Partial<InsertActivity>) => Promise<void>;
  activity?: SelectActivity | null;
  hotels?: { id: number; name: string }[];
}

const CATEGORIES = [
  { id: "restaurants", label: "Restaurants & Dining" },
  { id: "tours", label: "Tours & Excursions" },
  { id: "wellness", label: "Spa & Wellness" },
  { id: "sports", label: "Sports & Outdoor" },
  { id: "entertainment", label: "Entertainment" },
  { id: "shopping", label: "Shopping" },
  { id: "culture", label: "Museums & Culture" },
  { id: "nature", label: "Parks & Nature" },
];

const PRICE_INDICATORS = ["free", "$", "$$", "$$$", "$$$$"];

export function ActivityDialog({
  isOpen,
  onClose,
  onSave,
  activity,
  hotels,
}: ActivityDialogProps) {
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState<Partial<InsertActivity>>({
    name: "",
    description: "",
    location: "",
    category: "restaurants",
    distance_from_hotel: "",
    price_indicator: "$",
    phone: "",
    website: "",
    image_url: "",
    hotel_id: null,
  });

  useEffect(() => {
    if (activity) {
      setFormData(activity);
    } else {
      setFormData({
        name: "",
        description: "",
        location: "",
        category: "restaurants",
        distance_from_hotel: "",
        price_indicator: "$",
        phone: "",
        website: "",
        image_url: "",
        hotel_id: null,
      });
    }
  }, [activity, isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof InsertActivity, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value as InsertActivity[typeof name],
    }));
  };

  const handleHotelChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      hotel_id: value === "none" ? null : Number(value),
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        const result = await uploadImageAction(base64);
        if (result.success && result.data) {
          setFormData((prev) => ({ ...prev, image_url: result.data }));
        } else {
          console.error("Upload failed:", result.error);
        }
        setUploadingImage(false);
      };
    } catch (error) {
      console.error("Image upload failed:", error);
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-card border-border overflow-y-auto max-h-[90vh]">
        <DialogHeader className="mb-6">
          <DialogTitle className="text-2xl font-bold">
            {activity ? "Edit Activity" : "Add New Activity"}
          </DialogTitle>
          <p className="text-muted-foreground text-sm">
            Curate an unforgettable experience for your guests.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-[10px] uppercase tracking-widest text-neutral-500"
                >
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name || ""}
                  onChange={handleInputChange}
                  required
                  className="bg-transparent border-white/10 focus:border-white/30 transition-all rounded-none"
                  placeholder="e.g. Sunset Kayaking"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="category"
                  className="text-[10px] uppercase tracking-widest text-neutral-500"
                >
                  Category
                </Label>
                <Select
                  value={formData.category || "restaurants"}
                  onValueChange={(val) => handleSelectChange("category", val)}
                >
                  <SelectTrigger className="bg-transparent border-white/10 rounded-none h-10">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F0F0F] border-white/10 text-gray-200">
                    {CATEGORIES.map((cat) => (
                      <SelectItem
                        key={cat.id}
                        value={cat.id}
                        className="hover:bg-white/5"
                      >
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hotel Selector (admin only) */}
              {hotels && hotels.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-neutral-500">
                    Hotel
                  </Label>
                  <Select
                    value={
                      formData.hotel_id ? String(formData.hotel_id) : "none"
                    }
                    onValueChange={handleHotelChange}
                  >
                    <SelectTrigger className="bg-transparent border-white/10 rounded-none h-10">
                      <SelectValue placeholder="Select hotel" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0F0F0F] border-white/10 text-gray-200">
                      <SelectItem value="none" className="hover:bg-white/5">
                        No Hotel
                      </SelectItem>
                      {hotels.map((hotel) => (
                        <SelectItem
                          key={hotel.id}
                          value={String(hotel.id)}
                          className="hover:bg-white/5"
                        >
                          {hotel.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="location"
                  className="text-[10px] uppercase tracking-widest text-neutral-500"
                >
                  Location
                </Label>
                <Input
                  id="location"
                  name="location"
                  value={formData.location || ""}
                  onChange={handleInputChange}
                  className="bg-transparent border-white/10 rounded-none"
                  placeholder="Street address or Area"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="distance_from_hotel"
                  className="text-[10px] uppercase tracking-widest text-neutral-500"
                >
                  Distance
                </Label>
                <Input
                  id="distance_from_hotel"
                  name="distance_from_hotel"
                  value={formData.distance_from_hotel || ""}
                  onChange={handleInputChange}
                  className="bg-transparent border-white/10 rounded-none"
                  placeholder="e.g. 5 min walk"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-neutral-500">
                  Visual
                </Label>
                <div className="relative group aspect-video bg-neutral-900 border border-dashed border-white/10 flex items-center justify-center overflow-hidden transition-all hover:border-white/30 cursor-pointer">
                  {formData.image_url ? (
                    <>
                      <Image
                        src={formData.image_url}
                        alt="Preview"
                        fill
                        className="object-cover grayscale-[0.5] hover:grayscale-0 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, image_url: "" }))
                        }
                        className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      {uploadingImage ? (
                        <Loader2 className="animate-spin text-neutral-500" />
                      ) : (
                        <>
                          <ImagePlus className="text-neutral-500" size={24} />
                          <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                            Upload Image
                          </span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    type="file"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleImageUpload}
                    accept="image/*"
                    disabled={uploadingImage}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="price_indicator"
                  className="text-[10px] uppercase tracking-widest text-neutral-500"
                >
                  Price indicator
                </Label>
                <Select
                  value={formData.price_indicator || "$"}
                  onValueChange={(val) =>
                    handleSelectChange("price_indicator", val)
                  }
                >
                  <SelectTrigger className="bg-transparent border-white/10 rounded-none h-10 italic font-medium">
                    <SelectValue placeholder="Price Tier" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0F0F0F] border-white/10 text-gray-200">
                    {PRICE_INDICATORS.map((price) => (
                      <SelectItem
                        key={price}
                        value={price}
                        className="hover:bg-white/5"
                      >
                        {price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-[10px] uppercase tracking-widest text-neutral-500"
                  >
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleInputChange}
                    className="bg-transparent border-white/10 rounded-none"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="website"
                    className="text-[10px] uppercase tracking-widest text-neutral-500"
                  >
                    Website
                  </Label>
                  <Input
                    id="website"
                    name="website"
                    value={formData.website || ""}
                    onChange={handleInputChange}
                    className="bg-transparent border-white/10 rounded-none"
                    placeholder="URL"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="description"
              className="text-[10px] uppercase tracking-widest text-neutral-500"
            >
              Narrative
            </Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ""}
              onChange={handleInputChange}
              required
              rows={4}
              className="bg-transparent border-white/10 rounded-none resize-none focus:border-white/30"
              placeholder="Describe the experience..."
            />
          </div>

          <DialogFooter className="pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploadingImage}>
              {loading ? (
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
              ) : activity ? (
                "Update Activity"
              ) : (
                "Save Activity"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
