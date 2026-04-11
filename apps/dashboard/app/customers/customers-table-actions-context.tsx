'use client';

import type { CustomerListItem } from '@/lib/types/customer';
import { createContext, useContext, type ReactNode } from 'react';

type CustomersTableActionsContextValue = {
  openCustomerDetail: (customer: CustomerListItem) => void;
  openToggleActive: (customer: CustomerListItem) => void;
  openDeleteCustomer: (customer: CustomerListItem) => void;
  openRestoreCustomer: (customer: CustomerListItem) => void;
};

const CustomersTableActionsContext = createContext<CustomersTableActionsContextValue | null>(null);

export function CustomersTableActionsProvider({
  children,
  openCustomerDetail,
  openToggleActive,
  openDeleteCustomer,
  openRestoreCustomer,
}: {
  children: ReactNode;
  openCustomerDetail: (customer: CustomerListItem) => void;
  openToggleActive: (customer: CustomerListItem) => void;
  openDeleteCustomer: (customer: CustomerListItem) => void;
  openRestoreCustomer: (customer: CustomerListItem) => void;
}) {
  return (
    <CustomersTableActionsContext.Provider
      value={{
        openCustomerDetail,
        openToggleActive,
        openDeleteCustomer,
        openRestoreCustomer,
      }}
    >
      {children}
    </CustomersTableActionsContext.Provider>
  );
}

export function useCustomersTableActions(): CustomersTableActionsContextValue {
  const ctx = useContext(CustomersTableActionsContext);
  if (!ctx) {
    throw new Error('useCustomersTableActions chỉ dùng trong CustomersTableActionsProvider.');
  }
  return ctx;
}
