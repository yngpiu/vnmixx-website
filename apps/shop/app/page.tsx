import { Button } from '@repo/ui/components/ui/button';

export default function Page() {
  return (
    <main className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <div>
          <h1 className="font-medium">Shop ready!</h1>
          <p>Bạn có thể dùng shadcn shared UI từ `packages/ui`.</p>
          <Button className="mt-2">Button</Button>
        </div>
      </div>
    </main>
  );
}
