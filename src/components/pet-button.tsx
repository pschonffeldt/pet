"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import PetForm from "./pet-form";
import { useState } from "react";

type PetButtonProps = {
  actionType: "add" | "edit" | "checkout";
  onClick?: () => void;
  children?: React.ReactNode;
};

export default function PetButton({
  actionType,
  onClick,
  children,
}: PetButtonProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  // Check if we are clicking the checkout button
  if (actionType === "checkout") {
    return (
      <Button variant="secondary" onClick={onClick}>
        {children}
      </Button>
    );
  }
  // Otherwise we run this
  return (
    <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
      <DialogTrigger asChild>
        {/* And we check which button (from the other 2) are we clickign */}
        {actionType === "add" ? (
          <Button size="icon">
            <PlusIcon className="h-6 w-6" />
          </Button>
        ) : (
          <Button variant="secondary">{children}</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {/* Depending on the button we change the form title */}
            {actionType === "add" ? "Add a new Pet" : "Edit pet"}
          </DialogTitle>
        </DialogHeader>

        <PetForm
          actionType={actionType}
          onFormSubmission={() => setIsFormOpen(false)}
        ></PetForm>
      </DialogContent>
    </Dialog>
  );
}
