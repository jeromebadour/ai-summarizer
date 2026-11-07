import { initials, type AvatarColour } from "@/lib/profile";

export const avatarHue: Record<AvatarColour, string> = {
  indigo: "#4f629c",
  teal: "#3f8f84",
  sage: "#5f9562",
  sand: "#b07f35",
  plum: "#8c5e91",
  rose: "#a65a68",
  steel: "#4c7ba3",
};

/** Mixed against the theme's own text and background, so one hue reads well in both Light and Dark. */
export function Avatar({ name, colour, size }: { name: string; colour: AvatarColour; size: number }) {
  const hue = avatarHue[colour];
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full border font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        color: `color-mix(in srgb, ${hue} 55%, var(--text))`,
        background: `color-mix(in srgb, ${hue} 20%, transparent)`,
        borderColor: `color-mix(in srgb, ${hue} 55%, transparent)`,
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
