import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ModelConfigurationsListProps {
  models: { id: number; model_name: string }[];
}

export function ModelConfigurationsList({
  models,
}: ModelConfigurationsListProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">
        Model Configurations ({models.length})
      </h3>
      {models.length === 0 ? (
        <Card>
          <CardContent className="pt-4 text-center text-gray-500">
            <p>No models configured for this session</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          {models.map((model) => (
            <Badge key={model.id} variant="outline">
              {model.model_name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
