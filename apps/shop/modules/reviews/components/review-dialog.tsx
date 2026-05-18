'use client';

import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Input } from '@repo/ui/components/ui/input';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { Star } from 'lucide-react';
import { useState } from 'react';
import { createProductReview } from '../api/reviews';

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  orderItemId: number;
  productName: string;
  onSuccess?: () => void;
}

export function ReviewDialog({
  open,
  onOpenChange,
  productId,
  orderItemId,
  productName,
  onSuccess,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) {
      setError('Vui lòng chọn số sao đánh giá.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createProductReview({
        productId,
        orderItemId,
        rating,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
      });

      onSuccess?.();
      onOpenChange(false);
      setTitle('');
      setContent('');
      setRating(5);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi gửi đánh giá.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      setTitle('');
      setContent('');
      setRating(5);
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Đánh giá sản phẩm</DialogTitle>
          <DialogDescription>
            Chia sẻ trải nghiệm của bạn về &quot;{productName}&quot;
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Số sao đánh giá</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={isSubmitting}
                  className="cursor-pointer transition-transform hover:scale-110"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  <Star
                    className="h-8 w-8"
                    fill={star <= (hoveredRating || rating) ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    style={{
                      color: star <= (hoveredRating || rating) ? '#fbbf24' : '#d1d5db',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="review-title" className="mb-2 block text-sm font-medium">
              Tiêu đề (không bắt buộc)
            </label>
            <Input
              id="review-title"
              placeholder="VD: Sản phẩm rất đẹp"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label htmlFor="review-content" className="mb-2 block text-sm font-medium">
              Nội dung (không bắt buộc)
            </label>
            <Textarea
              id="review-content"
              placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={1000}
              rows={4}
              disabled={isSubmitting}
            />
          </div>

          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Đang gửi...' : 'Gửi đánh giá'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
