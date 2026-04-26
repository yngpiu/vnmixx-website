'use client';

import { Dialog, DialogContent, DialogTitle } from '@repo/ui/components/ui/dialog';

type Props = {
  previewImageUrl: string | null;
  onClose: () => void;
};

export function SupportChatImagePreviewDialog({
  previewImageUrl,
  onClose,
}: Props): React.JSX.Element {
  return (
    <Dialog open={previewImageUrl !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 rounded-none border-none bg-transparent p-0 shadow-none ring-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">Xem trước ảnh đính kèm</DialogTitle>
        {previewImageUrl ? (
          <div
            className="flex h-full w-full items-center justify-center overflow-hidden p-2"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                onClose();
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewImageUrl}
              alt="Xem trước ảnh"
              className="h-auto max-h-[96vh] w-auto max-w-[98vw] object-contain"
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
