import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-[#3D2E6B] group-[.toaster]:border group-[.toaster]:border-[#ECE7F6] group-[.toaster]:shadow-[0_18px_40px_-20px_rgba(74,62,127,0.35)] group-[.toaster]:rounded-2xl",
          description: "group-[.toast]:text-[#5A4A8A]",
          actionButton:
            "group-[.toast]:bg-gradient-to-r group-[.toast]:from-[#7E6BAF] group-[.toast]:to-[#6A5A98] group-[.toast]:text-white",
          cancelButton: "group-[.toast]:bg-[#F4F0FB] group-[.toast]:text-[#5A4A8A]",
          success: "group-[.toaster]:text-[#3D2E6B] [&_[data-icon]]:text-[#7E6BAF]",
          error: "group-[.toaster]:text-[#3D2E6B] [&_[data-icon]]:text-[#B45309]",
          info: "group-[.toaster]:text-[#3D2E6B] [&_[data-icon]]:text-[#7E6BAF]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
