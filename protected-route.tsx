import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, useLocation, Redirect } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  const [location] = useLocation();

  // Проверка на то, что маршрут соответствует текущему пути
  const isActive = location === path;

  if (isLoading && isActive) {
    return (
      <div className="flex items-center justify-center w-full min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <Route path={path}>
      {() => {
        // Если пользователь не авторизован, перенаправляем на страницу авторизации
        if (!user) {
          return <Redirect to="/auth" />;
        }
        
        // Иначе отображаем компонент
        return <Component />;
      }}
    </Route>
  );
}