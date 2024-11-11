import { twMerge } from "tailwind-merge";
import clsx from "classnames";

export default function cn(...classNames) {
  return twMerge(clsx(classNames));
}
