import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-semibold text-foreground">404</h1>
            <h2 className="text-xl text-muted-foreground">Page Not Found</h2>
            <p className="text-muted-foreground max-w-md">
              The page you are looking for does not exist or has been moved.
            </p>
            <Button asChild>
              <Link href="/">Return Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
