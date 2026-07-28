interface RouteToastProps {
  message: string | null;
}

export function RouteToast({ message }: RouteToastProps) {
  return <div className={`route-toast ${message ? "show" : ""}`}>{message}</div>;
}
