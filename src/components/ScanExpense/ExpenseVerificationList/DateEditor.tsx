import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Edit2 } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";

interface DateEditorProps {
  date: string;
  onUpdateDate: (newDate: string) => void;
}

export function DateEditor({ date, onUpdateDate }: DateEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDate, setEditedDate] = useState(date);

  const handleSave = () => {
    onUpdateDate(editedDate);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDate(date);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Label htmlFor="receipt-date" className="text-xs text-muted-foreground">
          Data paragonu
        </Label>
        <div className="flex gap-2">
          <Input
            id="receipt-date"
            type="date"
            value={editedDate}
            onChange={(e) => setEditedDate(e.target.value)}
            className="h-8 text-sm"
          />
          <Button size="sm" variant="ghost" onClick={handleSave} className="h-8 px-2">
            ✓
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCancel} className="h-8 px-2">
            ✕
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Calendar className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">Data paragonu</p>
        <p className="text-sm font-medium">{formatDate(date)}</p>
      </div>
      <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0">
        <Edit2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
