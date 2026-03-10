"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Package,
  Plus,
  History,
  AlertTriangle,
  Search,
  MoreHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
  Edit2,
  Trash2,
  Loader2,
  Filter,
  X,
  TrendingUp,
  TrendingDown,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { StockTransactionSheet } from "@/components/school/inventory/stock-transaction-sheet";

interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  minQuantity: number;
  updatedAt: string;
}

interface Transaction {
  id: string;
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  description: string | null;
  recipientName: string | null;
  date: string;
  item: { id: string; name: string; category: string | null; unit: string | null };
  performedBy: { name: string | null } | null;
}

export function InventoryClient() {
  const { schoolSlug } = useParams();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [txOpen, setTxOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const [txType, setTxType] = useState<"IN" | "OUT" | "ADJUSTMENT">("IN");

  // Transaction history filter state
  const [filterItemId, setFilterItemId] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [txLoading, setTxLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, txRes] = await Promise.all([
        fetch(`/api/schools/${schoolSlug}/inventory`),
        fetch(`/api/schools/${schoolSlug}/inventory/transactions`),
      ]);

      const itemsData = await itemsRes.json();
      const txData = await txRes.json();

      setItems(itemsData);
      setTransactions(txData);
    } catch (error) {
      toast.error("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [schoolSlug]);

  const fetchTransactions = async () => {
    try {
      setTxLoading(true);
      const params = new URLSearchParams();
      if (filterItemId && filterItemId !== "all") params.set("itemId", filterItemId);
      if (filterType && filterType !== "all") params.set("type", filterType);
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);

      const res = await fetch(
        `/api/schools/${schoolSlug}/inventory/transactions?${params.toString()}`,
      );
      const data = await res.json();
      setTransactions(data);
    } catch (error) {
      toast.error("Failed to filter transactions");
    } finally {
      setTxLoading(false);
    }
  };

  const clearFilters = () => {
    setFilterItemId("all");
    setFilterType("all");
    setFilterFrom("");
    setFilterTo("");
    // Re-fetch without filters
    fetch(`/api/schools/${schoolSlug}/inventory/transactions`)
      .then((r) => r.json())
      .then(setTransactions)
      .catch(() => toast.error("Failed to reload transactions"));
  };

  const hasActiveFilters =
    (filterItemId && filterItemId !== "all") ||
    (filterType && filterType !== "all") ||
    filterFrom ||
    filterTo;

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase()),
  );

  const lowStockItems = items.filter((i) => i.quantity <= i.minQuantity);

  // Summary stats for transaction history
  const txStats = useMemo(() => {
    const totalIn = transactions
      .filter((t) => t.type === "IN")
      .reduce((s, t) => s + t.quantity, 0);
    const totalOut = transactions
      .filter((t) => t.type === "OUT")
      .reduce((s, t) => s + t.quantity, 0);
    const totalAdj = transactions
      .filter((t) => t.type === "ADJUSTMENT")
      .reduce((s, t) => s + t.quantity, 0);

    // Most moved item
    const itemCounts: Record<string, { name: string; count: number }> = {};
    transactions.forEach((t) => {
      if (!itemCounts[t.item.id]) {
        itemCounts[t.item.id] = { name: t.item.name, count: 0 };
      }
      itemCounts[t.item.id].count += t.quantity;
    });
    const sorted = Object.values(itemCounts).sort((a, b) => b.count - a.count);
    const topItem = sorted[0]?.name || "—";

    return { totalIn, totalOut, totalAdj, topItem };
  }, [transactions]);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "IN":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 font-medium border text-xs">
            <ArrowUpRight className="w-3 h-3 mr-1" /> Stock In
          </Badge>
        );
      case "OUT":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100 font-medium border text-xs">
            <ArrowDownRight className="w-3 h-3 mr-1" /> Issued Out
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 font-medium border text-xs">
            <RotateCcw className="w-3 h-3 mr-1" /> Adjustment
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Inventory Management
          </h1>
          <p className="text-muted-foreground">
            Track school supplies, assets, and equipment.
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" /> Add Item
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active item types in stock
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-none shadow-sm text-amber-700">
          <CardHeader className="pb-2 text-amber-700">
            <CardTitle className="text-sm font-medium">
              Low Stock Warning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockItems.length}</div>
            <p className="text-xs mt-1 font-medium">
              Items below minimum levels
            </p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-none shadow-sm text-emerald-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Transactions This Session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs mt-1">
              {txStats.totalIn} in · {txStats.totalOut} out
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">All Items</TabsTrigger>
          <TabsTrigger value="history">
            Movement Report
            {transactions.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {transactions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-normal capitalize"
                        >
                          {item.category || "Uncategorized"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.unit || "pcs"}
                      </TableCell>
                      <TableCell>
                        {item.quantity <= item.minQuantity ? (
                          <Badge
                            variant="destructive"
                            className="bg-red-100 text-red-600 hover:bg-red-100 border-none"
                          >
                            <AlertTriangle className="w-3 h-3 mr-1" /> Low Stock
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-600 hover:bg-emerald-100 border-none font-medium">
                            In Stock
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(item.updatedAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>
                              <History className="mr-2 h-4 w-4" /> View History
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setTxType("IN");
                                setTxOpen(true);
                              }}
                            >
                              <ArrowUpRight className="mr-2 h-4 w-4" /> Add
                              Stock
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedItemId(item.id);
                                setTxType("OUT");
                                setTxOpen(true);
                              }}
                            >
                              <ArrowDownRight className="mr-2 h-4 w-4" /> Record
                              Issue
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <Edit2 className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Card className="bg-emerald-500/5 border-emerald-100">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-emerald-700">Total Received</span>
                </div>
                <div className="text-2xl font-bold text-emerald-700">
                  {txStats.totalIn}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">units stocked in</p>
              </CardContent>
            </Card>
            <Card className="bg-blue-500/5 border-blue-100">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Total Issued</span>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {txStats.totalOut}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">units given out</p>
              </CardContent>
            </Card>
            <Card className="bg-amber-500/5 border-amber-100">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <RotateCcw className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">Adjustments</span>
                </div>
                <div className="text-2xl font-bold text-amber-700">
                  {txStats.totalAdj}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">units adjusted</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-primary">Most Moved</span>
                </div>
                <div className="text-base font-bold truncate" title={txStats.topItem}>
                  {txStats.topItem}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">by total units</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-3">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1 min-w-[160px]">
                  <label className="text-xs font-medium text-muted-foreground">Item</label>
                  <Select value={filterItemId} onValueChange={setFilterItemId}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All items" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All items</SelectItem>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 min-w-[140px]">
                  <label className="text-xs font-medium text-muted-foreground">Transaction Type</label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All types</SelectItem>
                      <SelectItem value="IN">Stock In</SelectItem>
                      <SelectItem value="OUT">Issued Out</SelectItem>
                      <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">From Date</label>
                  <Input
                    type="date"
                    className="h-8 text-sm w-36"
                    value={filterFrom}
                    onChange={(e) => setFilterFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">To Date</label>
                  <Input
                    type="date"
                    className="h-8 text-sm w-36"
                    value={filterTo}
                    onChange={(e) => setFilterTo(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 pb-0.5">
                  <Button
                    size="sm"
                    onClick={fetchTransactions}
                    disabled={txLoading}
                    className="h-8"
                  >
                    {txLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                    ) : (
                      <Filter className="h-3.5 w-3.5 mr-1" />
                    )}
                    Apply
                  </Button>
                  {hasActiveFilters && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearFilters}
                      className="h-8 text-muted-foreground"
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Issued To / Notes</TableHead>
                  <TableHead>Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-muted-foreground"
                    >
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} className="group">
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(tx.date), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{tx.item.name}</div>
                        {tx.item.category && (
                          <div className="text-xs text-muted-foreground capitalize">
                            {tx.item.category}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getTypeBadge(tx.type)}</TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        <span
                          className={
                            tx.type === "OUT"
                              ? "text-blue-600"
                              : tx.type === "IN"
                                ? "text-emerald-600"
                                : "text-amber-600"
                          }
                        >
                          {tx.type === "OUT" ? "−" : "+"}
                          {tx.quantity}{" "}
                          <span className="text-muted-foreground font-normal text-xs">
                            {tx.item.unit || "pcs"}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm max-w-[200px]">
                        {tx.recipientName ? (
                          <div>
                            <span className="font-medium">{tx.recipientName}</span>
                            {tx.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {tx.description}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground truncate block">
                            {tx.description || "—"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tx.performedBy?.name || "System"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <StockTransactionSheet
        open={txOpen}
        onOpenChange={setTxOpen}
        schoolSlug={schoolSlug as string}
        items={items}
        initialItemId={selectedItemId}
        initialType={txType}
        onSuccess={() => {
          fetchData();
          setTxOpen(false);
        }}
      />
    </div>
  );
}
