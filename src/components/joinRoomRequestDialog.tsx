"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

// host of room will see this dialog when a player requests to join their room
export default function JoinRoomRequestDialog({
  open,
  username,
  onDecline,
  onAccept,
}: {
  open: boolean;
  username: string;
  onDecline: ({ message }: { message?: string }) => void;
  onAccept: () => void;
}) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {username} wants to join your room
          </AlertDialogTitle>
          <AlertDialogDescription>
            Accept or decline {username}&apos;s request to join your room.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={() => onDecline({ message: "Declined by host" })}
          >
            Decline
          </AlertDialogCancel>
          <AlertDialogAction onClick={onAccept}>Accept</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
