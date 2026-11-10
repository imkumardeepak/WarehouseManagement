import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

import Dashboard from "@/pages/Dashboard";

import ItemMaster from "@/pages/masters/ItemMaster";
import CategoryMaster from "@/pages/masters/CategoryMaster";
import UnitMaster from "@/pages/masters/UnitMaster";
import WarehouseMaster from "@/pages/masters/WarehouseMaster";
import LocationMaster from "@/pages/masters/LocationMaster";
import SupplierMaster from "@/pages/masters/SupplierMaster";
import CustomerMaster from "@/pages/masters/CustomerMaster";

import GoodsReceiptPage from "@/pages/transactions/GoodsReceipt";
import StockIssuePage from "@/pages/transactions/StockIssue";
import StockTransferPage from "@/pages/transactions/StockTransfer";
import StockAdjustmentPage from "@/pages/transactions/StockAdjustment";
import OpeningStockPage from "@/pages/transactions/OpeningStock";

import CurrentStock from "@/pages/inventory/CurrentStock";
import StockLedger from "@/pages/inventory/StockLedger";
import LowStock from "@/pages/inventory/LowStock";
import OutOfStock from "@/pages/inventory/OutOfStock";
import BatchExpiry from "@/pages/inventory/BatchExpiry";

import StockSummary from "@/pages/reports/StockSummary";
import StockMovement from "@/pages/reports/StockMovement";
import StockValuation from "@/pages/reports/StockValuation";
import GoodsReceiptReport from "@/pages/reports/GoodsReceiptReport";
import StockIssueReport from "@/pages/reports/StockIssueReport";
import WarehouseWise from "@/pages/reports/WarehouseWise";

import GeneralSettings from "@/pages/settings/GeneralSettings";
import UserProfile from "@/pages/settings/UserProfile";
import DemoReset from "@/pages/settings/DemoReset";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />

          <Route path="/masters/items" element={<ItemMaster />} />
          <Route path="/masters/categories" element={<CategoryMaster />} />
          <Route path="/masters/units" element={<UnitMaster />} />
          <Route path="/masters/warehouses" element={<WarehouseMaster />} />
          <Route path="/masters/locations" element={<LocationMaster />} />
          <Route path="/masters/suppliers" element={<SupplierMaster />} />
          <Route path="/masters/customers" element={<CustomerMaster />} />

          <Route path="/transactions/goods-receipt" element={<GoodsReceiptPage />} />
          <Route path="/transactions/stock-issue" element={<StockIssuePage />} />
          <Route path="/transactions/stock-transfer" element={<StockTransferPage />} />
          <Route path="/transactions/stock-adjustment" element={<StockAdjustmentPage />} />
          <Route path="/transactions/opening-stock" element={<OpeningStockPage />} />

          <Route path="/inventory/current-stock" element={<CurrentStock />} />
          <Route path="/inventory/ledger" element={<StockLedger />} />
          <Route path="/inventory/low-stock" element={<LowStock />} />
          <Route path="/inventory/out-of-stock" element={<OutOfStock />} />
          <Route path="/inventory/batch-expiry" element={<BatchExpiry />} />

          <Route path="/reports/stock-summary" element={<StockSummary />} />
          <Route path="/reports/stock-movement" element={<StockMovement />} />
          <Route path="/reports/stock-valuation" element={<StockValuation />} />
          <Route path="/reports/goods-receipt" element={<GoodsReceiptReport />} />
          <Route path="/reports/stock-issue" element={<StockIssueReport />} />
          <Route path="/reports/warehouse-wise" element={<WarehouseWise />} />

          <Route path="/settings/general" element={<GeneralSettings />} />
          <Route path="/settings/profile" element={<UserProfile />} />
          <Route path="/settings/reset" element={<DemoReset />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
