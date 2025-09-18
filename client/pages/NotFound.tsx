import { useLocation } from "react-router-dom";
import { useEffect } from "react";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-red-600">404 - Not Found</h1>
      <p>The page you are looking for does not exist.</p>
    </div>
  );
}
