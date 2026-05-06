'use client';

const CHECKOUT_STEPS = ['Giỏ hàng', 'Đặt hàng', 'Thanh toán', 'Hoàn thành đơn'] as const;

/** Border + padding + square corners — match every checkout panel to the step bar shell. */
export const CHECKOUT_STEP_FRAME_CLASS = 'border border-border px-6 py-8';

export function CheckoutProgressSteps(props: { currentStep: number }): React.JSX.Element {
  const { currentStep } = props;
  return (
    <div className={CHECKOUT_STEP_FRAME_CLASS}>
      <div className="px-3">
        <div className="relative grid grid-cols-4 items-start text-center">
          <span
            className="absolute left-[12.5%] right-[12.5%] top-[7px] h-px bg-border"
            aria-hidden
          />
          {CHECKOUT_STEPS.map((step, index) => {
            const isActive = index <= currentStep;
            return (
              <div key={step} className="relative z-10 flex flex-col items-center gap-3">
                <span
                  className={`size-3 rounded-full border ${isActive ? 'border-foreground bg-foreground' : 'border-border bg-background'}`}
                  aria-hidden
                />
                <span className="text-[13px] leading-5 text-muted-foreground">{step}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
