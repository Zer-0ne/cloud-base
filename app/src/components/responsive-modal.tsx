import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'; // Adjust import path based on your setup
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer'; // Adjust import path based on your setup
import { useMediaQuery } from '@/hooks/use-media-query';

// Define props for the ModalDrawer component
interface ModalDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isDesktop?: boolean;
  title: string;
  children: React.ReactNode; // The main content to render inside the modal/drawer
  footer: React.ReactNode; // The footer content
  className?: string; // Optional className for additional styling
}

// Reusable ModalDrawer component
const ModalDrawer: React.FC<ModalDrawerProps> = ({
  isOpen,
  onOpenChange,
  title,
  children,
  footer,
  className = '',
}) => {
  const isDesktop = useMediaQuery("(min-width: 768px)"); // ✅ Check if it's a desktop

  return isDesktop ? (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className={`sm:max-w-[425px] bg-background/50  backdrop-blur backdrop-saturate-150 max-h-[90vh] overflow-auto ${className}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
        <DialogFooter>{footer}</DialogFooter>
      </DialogContent>
    </Dialog>
  ) : (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className='truncate w-full'>{title}</DrawerTitle>
        </DrawerHeader>
        <div className={`px-4 ${className}`}>{children}</div>
        <DrawerFooter>{footer}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ModalDrawer;