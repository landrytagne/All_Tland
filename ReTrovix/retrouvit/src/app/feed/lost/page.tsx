"use client";

import * as React from "react";
import { Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { lostObjectsApi, type LostObjectResponse, type PageResponse } from "@/lib/api-objects";
import { categories, cities } from "@/lib/data";
import { useTranslation } from "@/lib/i18n";

const PAGE_SIZE = 12;

export default function LostObjectsFeedPage() {
  return (
    <AuthGuard>
      <LostObjectsFeed />
    </AuthGuard>
  );
}

function LostObjectsFeed() {
  const { t } = useTranslation();
  const [pageData, setPageData] = React.useState<PageResponse<LostObjectResponse> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPage, setCurrentPage] = React.useState(0);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [selectedCity, setSelectedCity] = React.useState("all");

  React.useEffect(() => {
    const fetchObjects = async () => {
      setIsLoading(true);
      try {
        if (selectedCategory !== "all") {
          const data = await lostObjectsApi.getByCategory(selectedCategory, currentPage, PAGE_SIZE);
          setPageData(data);
        } else if (selectedCity !== "all") {
          const data = await lostObjectsApi.getByCity(selectedCity, currentPage, PAGE_SIZE);
          setPageData(data);
        } else {
          const data = await lostObjectsApi.getAll(currentPage, PAGE_SIZE);
          setPageData(data);
        }
      } catch (err) {
        console.warn("Could not fetch lost objects:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchObjects();
  }, [currentPage, selectedCategory, selectedCity]);

  const filteredObjects = React.useMemo(() => {
    if (!pageData) return [];
    if (!searchQuery) return pageData.content;
    return pageData.content.filter((obj) =>
      obj.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      obj.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pageData, searchQuery]);

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    setCurrentPage(0);
  };

  const handleCityChange = (value: string) => {
    setSelectedCity(value);
    setCurrentPage(0);
  };

  const clearFilters = () => {
    setSelectedCategory("all");
    setSelectedCity("all");
    setSearchQuery("");
    setCurrentPage(0);
  };

  return (
    <MainLayout>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-orange-brand/10 flex items-center justify-center">
              <Search className="h-5 w-5 text-orange-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("feed.lostObjects")}</h1>
              <p className="text-sm text-muted-foreground">
                {t("feed.lostObjects") === "Objets perdus" ? "Parcourez les annonces et aidez à les retrouver." : "Browse listings and help find them."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("feed.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("feed.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("feed.allCategories")}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCity} onValueChange={handleCityChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder={t("feed.city")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("feed.allCities")}</SelectItem>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(selectedCategory !== "all" || selectedCity !== "all" || searchQuery) && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                <X className="h-3 w-3" />
                {t("landing.clearFilters")}
              </Button>
            )}
          </div>
        </div>

        {!isLoading && pageData && (
          <p className="text-sm text-muted-foreground mb-4">
            {pageData.totalElements} {t("feed.results")}
            {searchQuery && ` ${t("landing.resultsFor")} "${searchQuery}"`}
          </p>
        )}

        {isLoading ? (
          <ObjectCardGridSkeleton count={6} />
        ) : filteredObjects.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
              {filteredObjects.map((obj) => (
                <ObjectCard
                  key={obj.id}
                  id={String(obj.id)}
                  title={obj.title}
                  description={obj.description}
                  category={obj.category}
                  location={obj.location}
                  date={obj.dateLost}
                  image={obj.image}
                  user={{
                    name: obj.user.name,
                    trustScore: obj.user.trustScore || 50,
                    verified: obj.user.verified || false,
                  }}
                  status={obj.status.toLowerCase() as "active" | "matched" | "resolved" | "expired"}
                  reward={obj.reward}
                  views={obj.views}
                  type="lost"
                />
              ))}
            </div>

            {pageData && pageData.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  disabled={pageData.first}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {t("landing.previous")}
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(pageData.totalPages, 5) }, (_, i) => {
                    let pageNum: number;
                    if (pageData.totalPages <= 5) {
                      pageNum = i;
                    } else if (currentPage < 3) {
                      pageNum = i;
                    } else if (currentPage > pageData.totalPages - 4) {
                      pageNum = pageData.totalPages - 5 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-9 h-9 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                      >
                        {pageNum + 1}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(pageData.totalPages - 1, p + 1))}
                  disabled={pageData.last}
                >
                  {t("landing.next")}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t("landing.noResults")}</h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                {t("landing.noResultsDesc")}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
