import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";

export default function PetForm() {
  return (
    <form className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" type="text"></Input>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ownerName">Owner Name</Label>
        <Input id="ownerName" type="text"></Input>
      </div>
      <div className="space-y-1">
        <Label htmlFor="imageUrl">Image URL</Label>
        <Input id="imageUrl" type="text"></Input>
      </div>
      <div className="space-y-1">
        <Label htmlFor="age">Age</Label>
        <Input id="age" type="number"></Input>
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3}></Textarea>
      </div>
    </form>
  );
}
