import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";
import { Gamepad2 } from "lucide-react";

export default function GameplayControls() {
  return (
    <Drawer direction="top">
      <Button asChild>
        <DrawerTrigger className="fixed top-4 right-4 flex flex-col">
          <p className="flex items-center gap-4">
            <span>controls</span>
            <Gamepad2 className="size-6" />
          </p>
        </DrawerTrigger>
      </Button>

      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            <p className="mb-3 text-center text-lg font-semibold">Controls</p>
          </DrawerTitle>
          <DrawerDescription>These are the controls.</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <div className="flex justify-center">
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-bold">Move:</span>
                <span className="font-mono">← →</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Soft Drop:</span>
                <span className="font-mono">↓</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Hard Drop:</span>
                <span className="font-mono">↑</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Rotate:</span>
                <span className="font-mono">Space / Z</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Pause:</span>
                <span className="font-mono">Escape</span>
              </div>
            </div>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
