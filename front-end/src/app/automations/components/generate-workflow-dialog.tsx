'use client';

import {zodResolver} from "@hookform/resolvers/zod";
import {useState} from "react";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {generateWorkflow} from "@/lib/api";

import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {Textarea} from "@/components/ui/textarea";

const formSchema = z.object({
  prompt: z.string().min(10, "Please describe the workflow in a sentence or two."),
  systemPrompt: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface GenerateWorkflowDialogPropsI {
  isOpen: boolean;
  onClose: () => void;
  onWorkflowGenerated: (workflowUuid: string) => void;
}

export default function GenerateWorkflowDialog({
  isOpen,
  onClose,
  onWorkflowGenerated,
}: GenerateWorkflowDialogPropsI) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      prompt: "",
      systemPrompt: "",
    },
    resolver: zodResolver(formSchema),
  });

  const handleSubmit = async (values: FormValues) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const workflowUuid = await generateWorkflow(values.prompt, values.systemPrompt);

      form.reset();
      onClose();
      onWorkflowGenerated(workflowUuid);
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Failed to generate workflow. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-background border-border">
        <DialogHeader>
          <DialogTitle>Generate Workflow from Prompt</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md relative mb-4" role="alert">
            {error}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="prompt"
              render={({field}) => (
                <FormItem>
                  <FormLabel>Describe the workflow you want to build</FormLabel>

                  <FormControl>
                    <Textarea
                      placeholder="e.g. When a new Productboard note is created, post a summary to a Slack channel."
                      rows={5}
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemPrompt"
              render={({field}) => (
                <FormItem>
                  <FormLabel>System prompt (optional)</FormLabel>

                  <FormControl>
                    <Textarea
                      placeholder="e.g. Always prefer Slack over email; keep workflows under five steps."
                      rows={3}
                      {...field}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Generating..." : "Generate"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
