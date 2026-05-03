'use client';

import type { CustomerAddress } from '@/modules/account/types/address';
import { CheckoutProgressSteps } from '@/modules/cart/components/checkout-progress-steps';
import { useCheckoutPageController } from '@/modules/cart/hooks/use-checkout-page-controller';
import type { CartItem } from '@/modules/cart/types/cart';
import type { CheckoutPaymentMethod } from '@/modules/cart/types/checkout';
import { PrimaryCtaButton } from '@/modules/common/components/primary-cta-button';
import { coerceHttpImageSrc } from '@/modules/common/utils/coerce-http-image-src';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { ShoppingBagIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

const moneyFormatter = new Intl.NumberFormat('vi-VN');
const leadtimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

function formatMoney(value: number): string {
  return `${moneyFormatter.format(value)}đ`;
}

function formatLeadtime(value: string | undefined): string {
  if (!value) {
    return 'Chưa có';
  }
  const deliveryDate = new Date(value);
  if (Number.isNaN(deliveryDate.getTime())) {
    return 'Chưa có';
  }
  return leadtimeFormatter.format(deliveryDate);
}

function getItemTotal(item: CartItem): number {
  return item.variant.price * item.quantity;
}

function getAddressLabel(address: CustomerAddress): string {
  return address.type === 'OFFICE' ? 'Cơ quan' : 'Nhà/chung cư';
}

function getAddressDetail(address: CustomerAddress): string {
  return [address.addressLine, address.ward.name, address.district.name, address.city.name]
    .filter(Boolean)
    .join(', ');
}

function PaymentMethodOption({
  value,
  currentValue,
  title,
  description,
  onChange,
}: {
  value: CheckoutPaymentMethod;
  currentValue: CheckoutPaymentMethod;
  title: string;
  description: string;
  onChange: (value: CheckoutPaymentMethod) => void;
}): React.JSX.Element {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-4 py-3">
      <input
        type="radio"
        name="payment-method"
        checked={currentValue === value}
        onChange={() => onChange(value)}
        className="mt-0.5 size-4 accent-primary"
      />
      <div className="space-y-1">
        <p className="text-[15px] font-medium text-foreground">{title}</p>
        <p className="text-[13px] text-muted-foreground">{description}</p>
      </div>
    </label>
  );
}

export function CheckoutPageContent(): React.JSX.Element {
  const {
    user,
    isAuthSessionReady,
    selectedAddressId,
    paymentMethod,
    isAddressDialogOpen,
    setIsAddressDialogOpen,
    setPaymentMethod,
    setSelectedAddressId,
    cartQuery,
    addressesQuery,
    shippingFeeQuery,
    placeOrderMutation,
    items,
    addresses,
    selectedAddress,
    subtotal,
    totalQuantity,
    shippingFee,
    grandTotal,
    selectedService,
    handlePlaceOrder,
  } = useCheckoutPageController();
  if (!isAuthSessionReady) {
    return <main className="shop-shell-container py-8" />;
  }
  if (user === null) {
    return (
      <main className="shop-shell-container py-8">
        <p className="text-sm text-muted-foreground">Vui lòng đăng nhập để đặt hàng.</p>
      </main>
    );
  }
  if (cartQuery.isLoading || addressesQuery.isLoading) {
    return (
      <main className="shop-shell-container py-8">
        <p className="text-sm text-muted-foreground">Đang tải thông tin đặt hàng...</p>
      </main>
    );
  }
  if (cartQuery.isError || addressesQuery.isError) {
    return (
      <main className="shop-shell-container py-8">
        <p className="text-sm text-destructive" role="alert">
          Không thể tải dữ liệu đặt hàng.
        </p>
      </main>
    );
  }
  if (items.length === 0) {
    return (
      <main className="shop-shell-container py-8">
        <section className="rounded-lg border border-dashed p-10 text-center">
          <ShoppingBagIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">Giỏ hàng của bạn đang trống.</p>
          <PrimaryCtaButton asChild>
            <Link href="/">Tiếp tục mua sắm</Link>
          </PrimaryCtaButton>
        </section>
      </main>
    );
  }
  return (
    <main className="shop-shell-container py-8">
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-6">
          <CheckoutProgressSteps currentStep={1} />
          <section className="space-y-4 border border-border p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-semibold">Địa chỉ giao hàng</h2>
              {addresses.length > 0 ? (
                <button
                  type="button"
                  className="text-sm text-muted-foreground underline underline-offset-4"
                  onClick={() => setIsAddressDialogOpen(true)}
                >
                  Chọn địa chỉ khác
                </button>
              ) : null}
            </div>
            {selectedAddress ? (
              <div className="rounded-md border border-border bg-muted/20 p-4 text-sm">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground">
                    {selectedAddress.fullName} ({getAddressLabel(selectedAddress)})
                  </p>
                  {selectedAddress.isDefault ? (
                    <span className="rounded-sm border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
                      Mặc định
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-muted-foreground">
                  Điện thoại: {selectedAddress.phoneNumber}
                </p>
                <p className="mt-1 text-muted-foreground">
                  Địa chỉ: {getAddressDetail(selectedAddress)}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bạn chưa có địa chỉ. Vui lòng thêm địa chỉ trong tài khoản.
              </p>
            )}
            <div className="pt-1">
              <PrimaryCtaButton ctaVariant="outline" asChild className="w-auto!">
                <Link href="/tai-khoan/dia-chi">+ THÊM ĐỊA CHỈ</Link>
              </PrimaryCtaButton>
            </div>
          </section>
          <section className="space-y-3 border border-border p-5">
            <h2 className="text-xl font-semibold">Phương thức thanh toán</h2>
            <PaymentMethodOption
              value="COD"
              currentValue={paymentMethod}
              title="Thanh toán khi nhận hàng"
              description="Bạn thanh toán trực tiếp cho nhân viên giao hàng."
              onChange={setPaymentMethod}
            />
            <PaymentMethodOption
              value="BANK_TRANSFER_QR"
              currentValue={paymentMethod}
              title="Thanh toán qua mã QR"
              description="Bạn quét mã QR và chuyển khoản để hoàn tất thanh toán."
              onChange={setPaymentMethod}
            />
          </section>
          <section className="border border-border p-5">
            <h2 className="mb-4 text-xl font-semibold">Giỏ hàng của bạn</h2>
            <header className="grid grid-cols-[1fr_130px_130px] items-center border-b border-border pb-4 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <span>Tên sản phẩm</span>
              <span className="text-center">Số lượng</span>
              <span className="text-right">Tổng tiền</span>
            </header>
            <div>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_130px_130px] items-start gap-3 border-b border-border py-4"
                >
                  <div className="grid grid-cols-[76px_1fr] gap-3">
                    <div className="relative h-[104px] w-[76px] overflow-hidden">
                      <Image
                        src={
                          coerceHttpImageSrc(item.variant.product.previewUrl) ??
                          '/images/placeholder.jpg'
                        }
                        alt={item.variant.product.name}
                        fill
                        sizes="76px"
                        className="object-cover"
                      />
                    </div>
                    <div className="pt-0.5">
                      <p className="text-[16px] leading-6 text-foreground">
                        {item.variant.product.name}
                      </p>
                      <p className="mt-1 text-[13px] leading-5 text-muted-foreground">
                        Màu sắc: {item.variant.color.name}
                        <span className="ml-4">Kích cỡ: {item.variant.size.label}</span>
                      </p>
                    </div>
                  </div>
                  <div className="self-center text-center text-sm">{item.quantity}</div>
                  <div className="self-center text-right">
                    <p className="text-[18px] font-semibold leading-none text-foreground">
                      {formatMoney(getItemTotal(item))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
        <aside className="h-fit border border-border p-4">
          <h3 className="text-[24px] leading-none font-semibold text-foreground">
            Tóm tắt đơn hàng
          </h3>
          <div className="mt-5 space-y-4 border-b border-border pb-5 text-[16px] leading-none">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tổng sản phẩm</span>
              <span className="text-foreground">{totalQuantity}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tạm tính</span>
              <span className="text-foreground">{formatMoney(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Phí vận chuyển</span>
              <span className="text-foreground">
                {shippingFeeQuery.isLoading ? 'Đang tính...' : formatMoney(shippingFee)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Giao dự kiến</span>
              <span className="text-right text-foreground">
                {shippingFeeQuery.isLoading
                  ? 'Đang tính...'
                  : formatLeadtime(selectedService?.leadtime)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Tiền thanh toán</span>
              <span className="font-semibold text-foreground">{formatMoney(grandTotal)}</span>
            </div>
          </div>
          <PrimaryCtaButton
            className="mt-5"
            onClick={handlePlaceOrder}
            disabled={
              placeOrderMutation.isPending ||
              shippingFeeQuery.isLoading ||
              !selectedAddressId ||
              !selectedService
            }
          >
            {placeOrderMutation.isPending
              ? 'ĐANG XỬ LÝ...'
              : paymentMethod === 'BANK_TRANSFER_QR'
                ? 'TIẾP TỤC THANH TOÁN'
                : 'HOÀN THÀNH'}
          </PrimaryCtaButton>
          <Button variant="link" asChild className="mt-3 h-auto p-0 text-muted-foreground">
            <Link href="/gio-hang">Quay lại giỏ hàng</Link>
          </Button>
        </aside>
      </section>
      <Dialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[860px]">
          <DialogHeader>
            <DialogTitle>Chọn địa chỉ</DialogTitle>
            <DialogDescription className="sr-only">
              Chọn một địa chỉ giao hàng từ danh sách địa chỉ của bạn.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {addresses.map((address) => (
              <button
                key={address.id}
                type="button"
                className={`w-full rounded-md border p-4 text-left transition-colors ${
                  selectedAddressId === address.id
                    ? 'border-emerald-300 bg-emerald-50/30'
                    : 'border-border hover:bg-muted/20'
                }`}
                onClick={() => {
                  setSelectedAddressId(address.id);
                  setIsAddressDialogOpen(false);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm">
                    <p className="font-medium text-foreground">
                      {address.fullName} ({getAddressLabel(address)})
                    </p>
                    <p className="mt-1 text-muted-foreground">Điện thoại: {address.phoneNumber}</p>
                    <p className="mt-1 text-muted-foreground">
                      Địa chỉ: {getAddressDetail(address)}
                    </p>
                  </div>
                  {address.isDefault ? (
                    <span className="rounded-sm bg-foreground px-3 py-1 text-[11px] font-medium text-background">
                      MẶC ĐỊNH
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
