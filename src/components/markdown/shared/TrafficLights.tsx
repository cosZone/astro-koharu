/**
 * Mac window traffic light dots (red, yellow, green)
 */
export function TrafficLights() {
  return (
    <div className="flex gap-2">
      <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
      <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
      <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
    </div>
  );
}
