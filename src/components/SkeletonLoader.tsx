import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SkeletonLoaderProps {
  variant: "summary" | "chart" | "list" | "card";
  count?: number;
}

export function SkeletonLoader({ variant, count = 1 }: SkeletonLoaderProps) {
  if (variant === "summary") {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (variant === "chart") {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <Skeleton className="h-64 w-64 rounded-full" />
        </CardContent>
      </Card>
    );
  }

  if (variant === "list") {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: count }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-20" />
              </div>
              {index < count - 1 && <Skeleton className="h-px w-full" />}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (variant === "card") {
    return (
      <div className="space-y-2 p-4 border rounded-lg">
        <div className="flex justify-between items-start">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    );
  }

  return null;
}
