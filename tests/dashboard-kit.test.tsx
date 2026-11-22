import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AnimatedTabs } from "@/components/dashboard/animated-tabs";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DataTable, type DataColumn } from "@/components/dashboard/data-table";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Gauge, ProgressBar } from "@/components/dashboard/progress";

const chartLabels = { viewData: "View data", viewChart: "View chart", exportCsv: "Export CSV" };

describe("KpiCard", () => {
  it("renders the value, a non-colour delta and a detail link", () => {
    render(
      <KpiCard
        label="GMV"
        value="৳12,500"
        delta={{ value: 12.5, meaning: "good", label: "vs previous 30 days" }}
        href="/admin/orders"
        sparkline={[1, 2, 3]}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/admin/orders");
    expect(within(link).getByText("৳12,500")).toBeInTheDocument();
    expect(within(link).getByText("+12.5%")).toBeInTheDocument();
    expect(within(link).getByText("vs previous 30 days")).toBeInTheDocument();
  });

  it("shows an em dash when there is no previous period", () => {
    render(<KpiCard label="Orders" value="0" delta={{ value: null, label: "vs previous" }} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

describe("ChartCard", () => {
  it("toggles between the chart and its data table", async () => {
    render(
      <ChartCard
        title="Orders"
        summary="Orders rose from 2 to 4."
        labels={chartLabels}
        table={{
          columns: [
            { key: "day", label: "Day" },
            { key: "orders", label: "Orders", align: "end" },
          ],
          rows: [
            { day: "2026-11-20", orders: 2 },
            { day: "2026-11-21", orders: 4 },
          ],
        }}
        csvName="orders"
      >
        <div>chart-body</div>
      </ChartCard>,
    );
    expect(screen.getByText("chart-body")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "View data" }));
    expect(screen.queryByText("chart-body")).not.toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("2026-11-21")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "View chart" }));
    expect(screen.getByText("chart-body")).toBeInTheDocument();
  });

  it("renders loading, empty and retry states", async () => {
    const retry = vi.fn();
    const { rerender } = render(
      <ChartCard title="A" loading labels={chartLabels}>
        <div>body</div>
      </ChartCard>,
    );
    expect(screen.queryByText("body")).not.toBeInTheDocument();
    rerender(
      <ChartCard
        title="A"
        labels={chartLabels}
        error={{ message: "Could not load", retryLabel: "Try again", onRetry: retry }}
      >
        <div>body</div>
      </ChartCard>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledTimes(1);
    rerender(
      <ChartCard title="A" labels={chartLabels} empty={{ message: "Nothing here" }}>
        <div>body</div>
      </ChartCard>,
    );
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});

describe("DonutChart", () => {
  it("caps slices and groups the remainder into Other", () => {
    render(
      <DonutChart
        centerLabel="Total"
        summary="Payment mix by method."
        data={[
          { label: "COD", value: 50 },
          { label: "bKash", value: 20 },
          { label: "Nagad", value: 10 },
          { label: "Card", value: 8 },
          { label: "Bank", value: 6 },
          { label: "Rocket", value: 4 },
          { label: "Other legacy", value: 2 },
        ]}
      />,
    );
    const label = screen.getByLabelText("Payment mix by method.");
    expect(label).toBeInTheDocument();
    expect(screen.getByText("Other")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("100")).toBeInTheDocument();
  });
});

describe("FunnelChart", () => {
  it("shows step conversions with text, not only colour", () => {
    render(
      <FunnelChart
        summary="Order pipeline."
        stages={[
          { label: "Pending", value: 10 },
          { label: "Confirmed", value: 8 },
          { label: "Delivered", value: 4 },
        ]}
      />,
    );
    expect(screen.getByLabelText("Order pipeline.")).toBeInTheDocument();
    expect(screen.getByText("80.0% step")).toBeInTheDocument();
    expect(screen.getByText("50.0% step")).toBeInTheDocument();
  });
});

describe("ProgressBar and Gauge", () => {
  it("expose meter semantics and exact values", () => {
    render(<ProgressBar label="COD dues" value={750} max={1000} valueText="৳750 of ৳1,000" />);
    const meter = screen.getByRole("meter", { name: "COD dues" });
    expect(meter).toHaveAttribute("aria-valuenow", "750");
    expect(meter).toHaveAttribute("aria-valuemax", "1000");
    expect(screen.getByText("৳750 of ৳1,000")).toBeInTheDocument();
  });

  it("renders a gauge with the same accessible values", () => {
    render(<Gauge label="Limit use" value={2} max={4} valueText="50%" />);
    expect(screen.getByRole("meter", { name: "Limit use" })).toHaveAttribute("aria-valuetext", "50%");
  });
});

describe("AnimatedTabs", () => {
  it("lazy-mounts visited panels, keeps them, and syncs the URL", async () => {
    window.history.replaceState(null, "", "/admin?tab=one");
    render(
      <AnimatedTabs
        label="Sections"
        urlParam="tab"
        defaultValue="one"
        tabs={[
          { value: "one", label: "One", content: <div>panel one</div> },
          { value: "two", label: "Two", content: <div>panel two</div> },
          { value: "three", label: "Three", content: <div>panel three</div> },
        ]}
      />,
    );
    expect(screen.getByText("panel one")).toBeInTheDocument();
    expect(screen.queryByText("panel two")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("tab", { name: "Two" }));
    expect(screen.getByText("panel two")).toBeInTheDocument();
    expect(screen.getByText("panel one")).toBeInTheDocument();
    expect(screen.queryByText("panel three")).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get("tab")).toBe("two");

    const tabs = screen.getAllByRole("tab");
    tabs[1].focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute("aria-selected", "true");
    expect(new URLSearchParams(window.location.search).get("tab")).toBe("three");
  });
});

interface Row {
  id: string;
  name: string;
  count: number;
}

const columns: DataColumn<Row>[] = [
  { key: "name", header: "Name", render: (row) => row.name, sortValue: (row) => row.name },
  { key: "count", header: "Count", align: "end", render: (row) => row.count, sortValue: (row) => row.count },
];

describe("DataTable", () => {
  it("sorts rows and toggles density", async () => {
    render(
      <DataTable
        caption="Products"
        emptyText="No products"
        getRowKey={(row) => row.id}
        columns={columns}
        rows={[
          { id: "a", name: "Aloe", count: 4 },
          { id: "b", name: "Basil", count: 2 },
        ]}
        labels={{ density: "Density", sortBy: "Sort by" }}
      />,
    );
    const table = screen.getAllByRole("table")[0];
    const bodyRows = () => within(table).getAllByRole("row").slice(1);
    expect(within(bodyRows()[0]).getByText("Aloe")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sort by: Name" }));
    expect(within(bodyRows()[0]).getByText("Aloe")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Sort by: Name" }));
    expect(within(bodyRows()[0]).getByText("Basil")).toBeInTheDocument();
    const density = screen.getByRole("button", { name: "Density" });
    expect(density).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(density);
    expect(density).toHaveAttribute("aria-pressed", "true");
  });
});
