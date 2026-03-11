"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import * as XLSX from "xlsx";

const LINEN_ITEMS = ["Fitted Sheet", "Duvet Cover", "King Pillow Case", "Standard Pillow Case", "Bath Towel", "Face Towel", "Hand Towel", "Bath Mat", "Bath Rope"];

interface InventoryRow {
  item: string;
  inRoom: number;
  cleanStock: number;
  sentToLaundry: number;
  inLaundry: number;
  returnedToday: number;
  damaged: number;
  purchaseStock: number;
}

export default function InventoryForm() {
  const [inventory, setInventory] = useState<InventoryRow[]>(
    LINEN_ITEMS.map((item) => ({
      item,
      inRoom: 0,
      cleanStock: 0,
      sentToLaundry: 0,
      inLaundry: 0,
      returnedToday: 0,
      damaged: 0,
      purchaseStock: 0,
    })),
  );

  const [isDark, setIsDark] = useState(false);
  const [pic, setPic] = useState("");
  const isPicEmpty = !pic.trim();

  useEffect(() => {
    // Check system preference and stored preference
    const stored = localStorage.getItem("theme");
    if (stored) {
      setIsDark(stored === "dark");
      document.documentElement.classList.toggle("dark", stored === "dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(prefersDark);
      document.documentElement.classList.toggle("dark", prefersDark);
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !isDark;
    setIsDark(newDarkMode);
    document.documentElement.classList.toggle("dark", newDarkMode);
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
  };

  // Calculate total stock: sum of all fields EXCEPT purchaseStock
  const calculateTotalStock = (row: InventoryRow): number => {
    return row.inRoom + row.cleanStock + row.sentToLaundry + row.inLaundry + row.returnedToday + row.damaged;
  };

  const handleInputChange = (index: number, field: keyof InventoryRow, value: string) => {
    const newInventory = [...inventory];
    if (field !== "item") {
      const numValue = parseInt(value) || 0;
      newInventory[index] = {
        ...newInventory[index],
        [field]: numValue,
      };
    }
    setInventory(newInventory);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const dataWithTotals = inventory.map((row) => ({
        ...row,
        totalStock: calculateTotalStock(row),
      }));

      const response = await fetch("/api/submit-inventory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          pic: pic,
          data: dataWithTotals,
        }),
      });

      if (response.ok) {
        alert("Data submitted successfully to Google Sheets!");
        // Reset form
        setInventory(
          LINEN_ITEMS.map((item) => ({
            item,
            inRoom: 0,
            cleanStock: 0,
            sentToLaundry: 0,
            inLaundry: 0,
            returnedToday: 0,
            damaged: 0,
            purchaseStock: 0,
          })),
        );
        // Do NOT reset PIC here as per user request for persistence
      } else {
        alert("Error submitting data. Please check your Google Apps Script URL.");
      }
    } catch (error) {
      console.error("Submission error:", error);
      alert("Error submitting data. Please try again.");
    }
  };

  const handleExportExcel = () => {
    // Prepare metadata and header rows for a professional look
    const headerData = [
      ["LINEN INVENTORY REPORT"],
      ["Date:", new Date().toLocaleDateString()],
      ["Time:", new Date().toLocaleTimeString()],
      ["PIC Name:", pic || "-"],
      [], // Spacer row
      ["Linen Item", "In Room", "Clean Stock", "Sent To Laundry", "In Laundry", "Returned Today", "Damaged", "Total Stock", "Purchased Stock"],
    ];

    // Prepare data rows
    const rows = inventory.map((row) => [row.item, row.inRoom, row.cleanStock, row.sentToLaundry, row.inLaundry, row.returnedToday, row.damaged, calculateTotalStock(row), row.purchaseStock]);

    const worksheet = XLSX.utils.aoa_to_sheet([...headerData, ...rows]);

    // Set column widths for better readability
    worksheet["!cols"] = [
      { wch: 25 }, // Linen Item
      { wch: 12 }, // In Room
      { wch: 12 }, // Clean Stock
      { wch: 15 }, // Sent To Laundry
      { wch: 12 }, // In Laundry
      { wch: 15 }, // Returned Today
      { wch: 10 }, // Damaged
      { wch: 12 }, // Total Stock
      { wch: 15 }, // Purchased Stock
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Linen Inventory");

    // Generate filename with date
    const date = new Date().toISOString().split("T")[0];
    XLSX.writeFile(workbook, `LR_${date}.xlsx`);
  };

  return (
    <main className="min-h-screen bg-[#050505] p-4 md:p-8 transition-colors">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-neutral-800/50 pb-8">
          <div>
            <h1 className="text-3xl font-bold bg-linear-to-r from-neutral-100 to-neutral-400 bg-clip-text text-transparent">Linen Inventory</h1>
            <p className="text-neutral-500 text-sm mt-1">Daily tracking and management</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="space-y-1.5 flex-1 md:w-80">
              <label className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold ml-1">PIC Name</label>
              <Input
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                placeholder="Enter PIC name"
                className="h-11 border-neutral-800 bg-[#0a0a0a] text-neutral-100 placeholder:text-neutral-700 focus:border-blue-500/50 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-neutral-800 bg-[#0a0a0a]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                  <th className="px-6 py-4 text-left font-bold text-neutral-100 rounded-tl-xl">Linen Item</th>
                  <th className="px-6 py-4 text-center font-bold text-neutral-100">In Room</th>
                  <th className="px-6 py-4 text-center font-bold text-neutral-100">Clean Stock</th>
                  <th className="px-6 py-4 text-center font-bold text-neutral-100">Sent To laundry</th>
                  <th className="px-6 py-4 text-center font-bold text-neutral-100">In Laundry</th>
                  <th className="px-6 py-4 text-center font-bold text-neutral-100">Returned Today</th>
                  <th className="px-6 py-4 text-center font-bold text-neutral-100">Damaged</th>
                  <th className="px-6 py-4 text-center font-bold text-neutral-100">Total Stock</th>
                  <th className="px-6 py-4 text-center font-bold text-neutral-100 rounded-tr-xl">Purchased Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {inventory.map((row, index) => {
                  const totalStock = calculateTotalStock(row);
                  const isMatching = totalStock === row.purchaseStock;
                  const isPurchaseFilled = row.purchaseStock > 0;

                  return (
                    <tr key={index} className="group hover:bg-neutral-900/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-neutral-200">{row.item}</td>
                      <td className="px-6 py-4">
                        <Input
                          type="tel"
                          value={row.inRoom}
                          onChange={(e) => handleInputChange(index, "inRoom", e.target.value)}
                          placeholder="Enter"
                          disabled={isPicEmpty || !isPurchaseFilled}
                          className="h-10 border-neutral-800 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500/50 focus:ring-blue-500/20 disabled:opacity-20 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Input
                          type="tel"
                          value={row.cleanStock}
                          onChange={(e) => handleInputChange(index, "cleanStock", e.target.value)}
                          placeholder="Enter"
                          disabled={isPicEmpty || !isPurchaseFilled}
                          className="h-10 border-neutral-800 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500/50 focus:ring-blue-500/20 disabled:opacity-20 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Input
                          type="tel"
                          value={row.sentToLaundry}
                          onChange={(e) => handleInputChange(index, "sentToLaundry", e.target.value)}
                          placeholder="Enter"
                          disabled={isPicEmpty || !isPurchaseFilled}
                          className="h-10 border-neutral-800 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500/50 focus:ring-blue-500/20 disabled:opacity-20 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Input
                          type="tel"
                          value={row.inLaundry}
                          onChange={(e) => handleInputChange(index, "inLaundry", e.target.value)}
                          placeholder="Enter"
                          disabled={isPicEmpty || !isPurchaseFilled}
                          className="h-10 border-neutral-800 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500/50 focus:ring-blue-500/20 disabled:opacity-20 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Input
                          type="tel"
                          value={row.returnedToday}
                          onChange={(e) => handleInputChange(index, "returnedToday", e.target.value)}
                          placeholder="Enter"
                          disabled={isPicEmpty || !isPurchaseFilled}
                          className="h-10 border-neutral-800 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500/50 focus:ring-blue-500/20 disabled:opacity-20 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <Input
                          type="tel"
                          value={row.damaged}
                          onChange={(e) => handleInputChange(index, "damaged", e.target.value)}
                          placeholder="Enter"
                          disabled={isPicEmpty || !isPurchaseFilled}
                          className="h-10 border-neutral-800 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500/50 focus:ring-blue-500/20 disabled:opacity-20 disabled:cursor-not-allowed"
                        />
                      </td>
                      <td className={`px-6 py-4 text-center font-bold text-lg transition-colors ${isPicEmpty || !isPurchaseFilled ? "text-neutral-600" : isMatching ? "text-green-500" : "text-red-500"}`}>{totalStock}</td>
                      <td className="px-6 py-4">
                        <Input
                          type="tel"
                          value={row.purchaseStock}
                          onChange={(e) => handleInputChange(index, "purchaseStock", e.target.value)}
                          placeholder="Enter"
                          disabled={isPicEmpty}
                          className="h-10 border-neutral-800 bg-neutral-950 text-neutral-100 placeholder:text-neutral-600 focus:border-blue-500/50 focus:ring-blue-500/20 disabled:opacity-20 disabled:cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {inventory.map((row, index) => {
              const totalStock = calculateTotalStock(row);
              const isMatching = totalStock === row.purchaseStock;
              const isPurchaseFilled = row.purchaseStock > 0;

              return (
                <div key={index} className="rounded-xl border border-neutral-800 bg-[#0a0a0a] p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <h3 className="font-bold text-neutral-100 text-lg">{row.item}</h3>
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Total Stock</div>
                      <div className={`text-xl font-black transition-colors ${!isPurchaseFilled ? "text-neutral-600" : isMatching ? "text-green-500" : "text-red-500"}`}>{totalStock}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold ml-1">In Room</label>
                      <Input
                        type="tel"
                        value={row.inRoom}
                        onChange={(e) => handleInputChange(index, "inRoom", e.target.value)}
                        placeholder="0"
                        disabled={isPicEmpty || !isPurchaseFilled}
                        className="h-11 border-neutral-800 bg-neutral-950 text-neutral-100 disabled:opacity-20"
                      />
                    </div>
                    <div className="space-y-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold ml-1">Clean Stock</label>
                      <Input
                        type="tel"
                        value={row.cleanStock}
                        onChange={(e) => handleInputChange(index, "cleanStock", e.target.value)}
                        placeholder="0"
                        disabled={isPicEmpty || !isPurchaseFilled}
                        className="h-11 border-neutral-800 bg-neutral-950 text-neutral-100 disabled:opacity-20"
                      />
                    </div>
                    <div className="space-y-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold ml-1">Sent To laundry</label>
                      <Input
                        type="tel"
                        value={row.sentToLaundry}
                        onChange={(e) => handleInputChange(index, "sentToLaundry", e.target.value)}
                        placeholder="0"
                        disabled={isPicEmpty || !isPurchaseFilled}
                        className="h-11 border-neutral-800 bg-neutral-950 text-neutral-100 disabled:opacity-20"
                      />
                    </div>
                    <div className="space-y-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold ml-1">In Laundry</label>
                      <Input
                        type="tel"
                        value={row.inLaundry}
                        onChange={(e) => handleInputChange(index, "inLaundry", e.target.value)}
                        placeholder="0"
                        disabled={isPicEmpty || !isPurchaseFilled}
                        className="h-11 border-neutral-800 bg-neutral-950 text-neutral-100 disabled:opacity-20"
                      />
                    </div>
                    <div className="space-y-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold ml-1">Returned Today</label>
                      <Input
                        type="tel"
                        value={row.returnedToday}
                        onChange={(e) => handleInputChange(index, "returnedToday", e.target.value)}
                        placeholder="0"
                        disabled={isPicEmpty || !isPurchaseFilled}
                        className="h-11 border-neutral-800 bg-neutral-950 text-neutral-100 disabled:opacity-20"
                      />
                    </div>
                    <div className="space-y-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold ml-1">Damaged</label>
                      <Input
                        type="tel"
                        value={row.damaged}
                        onChange={(e) => handleInputChange(index, "damaged", e.target.value)}
                        placeholder="0"
                        disabled={isPicEmpty || !isPurchaseFilled}
                        className="h-11 border-neutral-800 bg-neutral-950 text-neutral-100 disabled:opacity-20"
                      />
                    </div>
                  </div>

                  <div className="pt-4 grid grid-cols-2 gap-4 border-t border-neutral-800">
                    <div className="space-y-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                      <label className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold ml-1">Purchased Stock</label>
                      <Input
                        type="tel"
                        value={row.purchaseStock}
                        onChange={(e) => handleInputChange(index, "purchaseStock", e.target.value)}
                        placeholder="0"
                        disabled={isPicEmpty}
                        className="h-11 border-neutral-800 bg-neutral-950 text-neutral-100 disabled:opacity-20 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="flex flex-col justify-center items-end pr-2">
                      <div className="text-[10px] uppercase tracking-wider text-[#8bc6e6] font-bold">Total Stock</div>
                      <div className={`text-2xl font-black transition-colors ${isPicEmpty || !isPurchaseFilled ? "text-neutral-600" : isMatching ? "text-green-500" : "text-red-500"}`}>{totalStock}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-4 md:static flex flex-wrap gap-4 pt-4 bg-[#050505]/80 backdrop-blur-sm md:bg-transparent pb-4 md:pb-0">
            <Button
              type="button"
              onClick={handleExportExcel}
              disabled={isPicEmpty}
              className="flex-1 md:flex-none h-12 md:h-11 px-8 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-600"
            >
              Export to Excel
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isPicEmpty}
                  className="flex-1 md:flex-none h-12 md:h-11 px-8 border-red-500/50 bg-red-500/5 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                  Reset
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#0a0a0a] border-neutral-800">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-neutral-100">Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="text-neutral-400">This action will reset all linen counts to zero. Your PIC Name will be preserved.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white">Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      setInventory(
                        LINEN_ITEMS.map((item) => ({
                          item,
                          inRoom: 0,
                          cleanStock: 0,
                          sentToLaundry: 0,
                          inLaundry: 0,
                          returnedToday: 0,
                          damaged: 0,
                          purchaseStock: 0,
                        })),
                      );
                    }}
                    className="bg-red-600 text-white hover:bg-red-700"
                  >
                    Reset All Data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </div>
    </main>
  );
}
