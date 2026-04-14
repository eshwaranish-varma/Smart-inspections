import { type ComponentPropsWithoutRef, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BentoGridProps extends ComponentPropsWithoutRef<"div"> {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps extends ComponentPropsWithoutRef<"div"> {
  name: string;
  className: string;
  background: ReactNode;
  Icon: React.ElementType;
  description: string;
  href: string;
  cta: string;
}

const BentoGrid = ({ children, className, ...props }: BentoGridProps) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  ...props
}: BentoCardProps) => (
  <div
    key={name}
    className={cn(
      "group relative col-span-3 flex flex-col justify-between overflow-hidden rounded-2xl",
      "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
      "dark:bg-slate-900 transform-gpu dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:[border:1px_solid_rgba(255,255,255,.1)]",
      className
    )}
    {...props}
  >
    <div>{background}</div>
    <div className="p-6">
      <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 transition-all duration-300 lg:group-hover:-translate-y-10">
        <Icon className="h-10 w-10 origin-left transform-gpu text-[#282e63] dark:text-indigo-300 transition-all duration-300 ease-in-out group-hover:scale-75" />
        <h3 className="mt-2 text-xl font-semibold text-[#282e63] dark:text-white">
          {name}
        </h3>
        <p className="max-w-lg text-sm leading-7 text-[#4B5565] dark:text-slate-400">{description}</p>
      </div>

      {/* Mobile CTA — always visible */}
      <div className="pointer-events-none flex w-full translate-y-0 transform-gpu flex-row items-center transition-all duration-300 group-hover:opacity-100 lg:hidden mt-3">
        <a
          href={href}
          className="pointer-events-auto inline-flex items-center gap-1 text-sm font-semibold text-[#282e63] dark:text-indigo-300"
        >
          {cta}
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </div>

    {/* Desktop CTA — slides up on hover */}
    <div className="pointer-events-none absolute bottom-0 hidden w-full translate-y-10 transform-gpu flex-row items-center p-6 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 lg:flex">
      <a
        href={href}
        className="pointer-events-auto inline-flex items-center gap-1 text-sm font-semibold text-[#282e63] dark:text-indigo-300"
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>

    <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[0.02] group-hover:dark:bg-neutral-800/10" />
  </div>
);

export { BentoCard, BentoGrid };
