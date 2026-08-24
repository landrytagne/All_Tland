"use client";

import * as React from "react";
import { Search, X, ChevronLeft, ChevronRight, SlidersHorizontal, Package, MapPin, Calendar, ArrowUpDown, Eye, TrendingUp, Sparkles, Filter } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import dynamic from "next/dynamic";

const ObjectCard = dynamic(
  () => import("@/components/object-card").then((m) => ({ default: m.ObjectCard })),
  {
    loading: () => (
      <div className="h-[280px] rounded-lg bg-muted/30 animate-pulse" />
    ),
    ssr: false,
  }
);
import { ObjectCardGridSkeleton } from "@/components/skeletons";
import {
  lostObjectsApi,
  foundObjectsApi,
  type LostObjectResponse,
  type FoundObjectResponse,
  type PageResponse,
} from "@/lib/api-objects";
import { categories, cities } from "@/lib/data";
import { cn, useDebounce } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

const PAGE_SIZE = 12;

type TabValue = "all" | "lost" | "found";
type SortValue = "recent" | "oldest" | "views";

interface FeedItem {
  type: "lost" | "found";
  data: LostObjectResponse | FoundObjectResponse;
}

export default function UnifiedFeedPage() {
  return (
    <AuthGuard>
      <UnifiedFeedContent />
    </AuthGuard>
  );
}

function UnifiedFeedContent() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<TabValue>("all");
  const [lostData, setLostData] = React.useState<PageResponse<LostObjectResponse> | null>(null);
  const [foundData, setFoundData] = React.useState<PageResponse<FoundObjectResponse> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [selectedCity, setSelectedCity] = React.useState("all");
  const [sortBy, setSortBy] = React.useState<SortValue>("recent");
  const [showFilters, setShowFilters] = React.useState(false);

  React.useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const promises: Promise<unknown>[] = [];
        const shouldFetchLost = activeTab === "all" || activeTab === "lost";
        const shouldFetchFound = activeTab === "all" || activeTab === "found";

        if (shouldFetchLost) {
          if (selectedCategory !== "all") {
            promises.push(
              lostObjectsApi.getByCategory(selectedCategory, currentPage, PAGE_SIZE).then((d) => setLostData(d))
            );
          } else if (selectedCity !== "all") {
            promises.push(
              lostObjectsApi.getByCity(selectedCity, currentPage, PAGE_SIZE).then((d) => setLostData(d))
            );
          } else {
            promises.push(
              lostObjectsApi.getAll(currentPage, PAGE_SIZE).then((d) => setLostData(d))
            );
          }
        }

        if (shouldFetchFound) {
          if (selectedCategory !== "all") {
            promises.push(
              foundObjectsApi.getByCategory(selectedCategory, currentPage, PAGE_SIZE).then((d) => setFoundData(d))
            );
          } else if (selectedCity !== "all") {
            promises.push(
              foundObjectsApi.getByCity(selectedCity, currentPage, PAGE_SIZE).then((d) => setFoundData(d))
            );
          } else {
            promises.push(
              foundObjectsApi.getAll(currentPage, PAGE_SIZE).then((d) => setFoundData(d))
            );
          }
        }

        await Promise.allSettled(promises);
      } catch (err) {
        console.warn("Could not fetch objects:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [activeTab, currentPage, selectedCategory, selectedCity]);

  const feedItems = React.useMemo(() => {
    const items: FeedItem[] = [];

    if (activeTab === "all" || activeTab === "lost") {
      if (lostData?.content) {
        lostData.content.forEach((item) => items.push({ type: "lost", data: item }));
      }
    }
    if (activeTab === "all" || activeTab === "found") {
      if (foundData?.content) {
        foundData.content.forEach((item) => items.push({ type: "found", data: item }));
      }
    }

    let filtered = items;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = items.filter(
        (item) =>
          item.data.title.toLowerCase().includes(q) ||
          item.data.description.toLowerCase().includes(q) ||
          item.data.category.toLowerCase().includes(q) ||
          item.data.location.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === "recent") {
        return new Date(b.data.createdAt).getTime() - new Date(a.data.createdAt).getTime();
      }
      if (sortBy === "oldest") {
        return new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime();
      }
      if (sortBy === "views") {
        return b.data.views - a.data.views;
      }
      return 0;
    });

    return filtered;
  }, [lostData, foundData, activeTab, searchQuery, sortBy]);

  const totalElements = (lostData?.totalElements || 0) + (foundData?.totalElements || 0);
  const totalPages = Math.max(lostData?.totalPages || 0, foundData?.totalPages || 0);
  const lostCount = lostData?.totalElements || 0;
  const foundCount = foundData?.totalElements || 0;

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("all");
    setSelectedCity("all");
    setSortBy("recent");
    setCurrentPage(0);
  };

  const hasActiveFilters = searchQuery || selectedCategory !== "all" || selectedCity !== "all";

  return (
    <MainLayout showFooter={false}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-forest via-forest/90 to-forest/70 p-6 sm:p-8 text-white">
          <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-orange-brand/20 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-forest-light/30 blur-2xl" />
          <div className="absolute top-1/2 right-1/4 h-20 w-20 rounded-full bg-white/10 blur-xl" />

          <div className="relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">{t("feed.title")}</h1>
                <p className="text-sm text-white/80">
                  {t("feed.title") === "Fil d'actualité" ? "Découvrez toutes les publications récentes" : "Discover all recent publications"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-4">
              <div className="flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-sm px-3 py-1.5 text-sm font-medium">
                <Package className="h-3.5 w-3.5" />
                <span>{totalElements} {t("feed.statsObjects")}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-orange-brand/30 backdrop-blur-sm px-3 py-1.5 text-sm font-medium">
                <span>🔍</span>
                <span>{lostCount} {t("feed.lostCount")}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-forest-light/30 backdrop-blur-sm px-3 py-1.5 text-sm font-medium">
                <span>✅</span>
                <span>{foundCount} {t("feed.foundCount")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs + Search */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabValue); setCurrentPage(0); }}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="all" className="data-[state=active]:bg-forest data-[state=active]:text-white">
                  <TrendingUp className="h-4 w-4 mr-1.5" />
                  {t("feed.all")}
                </TabsTrigger>
                <TabsTrigger value="lost" className="data-[state=active]:bg-orange-brand data-[state=active]:text-white">
                  🔍 {t("feed.lost")}
                </TabsTrigger>
                <TabsTrigger value="found" className="data-[state=active]:bg-forest data-[state=active]:text-white">
                  ✅ {t("feed.found")}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("feed.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
                  className="pl-9 rounded-xl bg-card"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "rounded-xl",
                  showFilters && "bg-forest/10 border-forest/30 text-forest"
                )}
              >
                <SlidersHorizontal className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">{t("feed.filters")}</span>
                {hasActiveFilters && (
                  <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-brand text-[10px] font-bold text-white">
                    !
                  </span>
                )}
              </Button>
            </div>
          </div>

          {showFilters && (
            <Card className="animate-slide-up border-forest/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Filter className="h-4 w-4 text-forest" />
                    {t("feed.advancedFilters")}
                  </div>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-orange-brand hover:text-orange-brand/80">
                      {t("feed.resetAll")}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("feed.category")}</label>
                    <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setCurrentPage(0); }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={t("feed.allCategories")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("feed.allCategories")}</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("feed.city")}</label>
                    <Select value={selectedCity} onValueChange={(v) => { setSelectedCity(v); setCurrentPage(0); }}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder={t("feed.allCities")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t("feed.allCities")}</SelectItem>
                        {cities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("feed.sortBy")}</label>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortValue)}>
                      <SelectTrigger className="rounded-xl">
                        <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">{t("feed.recent")}</SelectItem>
                        <SelectItem value="oldest">{t("feed.oldest")}</SelectItem>
                        <SelectItem value="views">{t("feed.views")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <ObjectCardGridSkeleton />
        ) : feedItems.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-muted mb-4">
              <Package className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("feed.noResults")}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {hasActiveFilters
                ? t("feed.noResultsDesc")
                : t("feed.noResultsDefault")}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={resetFilters} className="mt-4 rounded-xl">
                {t("feed.resetFilters")}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {feedItems.length} {t("feed.results")}
                {searchQuery && (
                  <span> {t("landing.resultsFor")} &ldquo;<span className="font-medium text-foreground">{searchQuery}</span>&rdquo;</span>
                )}
              </p>
              {hasActiveFilters && (
                <div className="flex items-center gap-2">
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {selectedCategory}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSelectedCategory("all")} />
                    </Badge>
                  )}
                  {selectedCity !== "all" && (
                    <Badge variant="secondary" className="rounded-full text-xs">
                      <MapPin className="h-3 w-3 mr-1" />
                      {selectedCity}
                      <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSelectedCity("all")} />
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {feedItems.map((item) => (
                <div key={`${item.type}-${item.data.id}`} className="hover-lift">
                  <div className="relative">
                    <div className={cn(
                      "absolute -top-2 left-3 z-10 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-white shadow-sm",
                      item.type === "lost" ? "bg-orange-brand" : "bg-forest"
                    )}>
                      {item.type === "lost" ? `🔍 ${t("feed.lost")}` : `✅ ${t("feed.found")}`}
                    </div>
                    <ObjectCard
                      id={String(item.data.id)}
                      title={item.data.title}
                      description={item.data.description}
                      category={item.data.category}
                      location={item.data.location}
                      date={item.type === "lost"
                        ? (item.data as LostObjectResponse).dateLost
                        : (item.data as FoundObjectResponse).dateFound}
                      image={item.data.image}
                      user={{
                        name: item.data.user?.name || "Anonyme",
                        avatar: item.data.user?.avatar,
                        trustScore: item.data.user?.trustScore || 50,
                        verified: item.data.user?.verified || false,
                      }}
                      status={(item.data.status as "active" | "matched" | "resolved" | "returned" | "expired") || "active"}
                      views={item.data.views}
                      type={item.type}
                    />
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  className="rounded-xl"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 7) {
                    pageNum = i;
                  } else if (currentPage < 3) {
                    pageNum = i;
                  } else if (currentPage > totalPages - 4) {
                    pageNum = totalPages - 7 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        "h-9 w-9 rounded-xl",
                        currentPage === pageNum && "bg-forest text-white"
                      )}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="rounded-xl"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
