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
import {
  Gamepad2,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  Triangle,
} from "lucide-react";

const Control = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-2 border-b pb-2 text-xl">
    <span className="font">{label}</span>
    <span className="font-bold">{value}</span>
  </div>
);

export default function GameplayControls() {
  return (
    <Drawer direction="right">
      <Button asChild>
        <DrawerTrigger className="flex flex-col">
          <p className="flex items-center justify-between gap-4">
            <span>controls</span>
            <Gamepad2 className="size-6" />
          </p>
        </DrawerTrigger>
      </Button>

      <DrawerContent className="max-w-[calc(min(600px,100%))]!">
        <DrawerHeader>
          <DrawerTitle className="mb-3 text-center text-2xl font-semibold">
            Controls
          </DrawerTitle>
          <DrawerDescription className="sr-only">
            gameplay controls
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="mt-2">
          <h4 className="mb-3 text-xl">keyboard</h4>
          <div className="flex flex-col justify-center gap-x-6 gap-y-2 text-sm">
            <Control
              label="Move:"
              value={
                <div className="flex items-center gap-2">
                  <ArrowLeft /> <ArrowRight />
                </div>
              }
            />
            <Control label="Soft Drop:" value={<ArrowDown />} />
            <Control label="Hard Drop:" value={<ArrowUp />} />
            <Control label="Rotate:" value="Space / Z" />
            <Control label="Hold / Swap:" value="C" />
            <Control label="Pause:" value="Escape" />
          </div>
          <h4 className="mt-4 mb-2 text-xl">Controller</h4>
          <div className="flex flex-col justify-center gap-x-6 gap-y-2 text-sm">
            <Control
              label="Move:"
              value={
                <div className="flex items-center gap-2">
                  <ArrowLeft /> <ArrowRight />
                </div>
              }
            />
            <Control label="Soft Drop:" value={<ArrowDown />} />
            <Control label="Hard Drop:" value={<ArrowUp />} />
            <Control
              label="Rotate:"
              value="A / B (Xbox) | X / O (PlayStation)"
            />
            <Control
              label="Hold / Swap:"
              value={
                <div className="flex items-center gap-2">
                  Y (Xbox) | <Triangle className="inline-block" /> (PlayStation)
                </div>
              }
            />
            <Control
              label="Pause / Resume:"
              value="Start (Xbox) | Options (PlayStation)"
            />
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
