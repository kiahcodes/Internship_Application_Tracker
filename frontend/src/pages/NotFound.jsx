import { Link } from "react-router-dom";
import { Button, EmptyState } from "../components/ui";

export function NotFound() {
  return (
    <div className="page">
      <EmptyState
        title="Page not found"
        action={
          <Button as={Link} to="/">
            Back to home
          </Button>
        }
      >
        The page you're looking for doesn't exist or has moved.
      </EmptyState>
    </div>
  );
}
