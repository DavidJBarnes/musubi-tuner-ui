import type { TrainingArgs } from "../../api/types";

interface Props {
  args: TrainingArgs;
  onChange: (a: TrainingArgs) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-text-dim mb-1">{label}</label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="text-xs font-medium text-accent mb-2 uppercase tracking-wider">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

const inputCls =
  "w-full bg-surface border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-accent";

export function TrainingArgsForm({ args, onChange }: Props) {
  const set = <K extends keyof TrainingArgs>(key: K, val: TrainingArgs[K]) =>
    onChange({ ...args, [key]: val });

  return (
    <div className="bg-surface-2 rounded-lg border border-border p-4">
      <h3 className="font-medium text-sm mb-3">Training Args</h3>

      <Section title="Model">
        <Field label="DiT Model Path">
          <input className={inputCls} value={args.dit_path} onChange={(e) => set("dit_path", e.target.value)} />
        </Field>
        <Field label="VAE Path">
          <input className={inputCls} value={args.vae_path} onChange={(e) => set("vae_path", e.target.value)} />
        </Field>
        <Field label="T5 Path">
          <input className={inputCls} value={args.t5_path} onChange={(e) => set("t5_path", e.target.value)} />
        </Field>
      </Section>

      <Section title="LoRA">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Network Dim">
            <input type="number" className={inputCls} value={args.network_dim} onChange={(e) => set("network_dim", parseInt(e.target.value) || 16)} />
          </Field>
          <Field label="Network Alpha">
            <input type="number" className={inputCls} value={args.network_alpha} onChange={(e) => set("network_alpha", parseInt(e.target.value) || 16)} />
          </Field>
          <Field label="LoRA+ Ratio">
            <input type="number" className={inputCls} value={args.loraplus_lr_ratio} onChange={(e) => set("loraplus_lr_ratio", parseInt(e.target.value) || 4)} />
          </Field>
        </div>
      </Section>

      <Section title="Timesteps">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Min Timestep">
            <input type="number" className={inputCls} value={args.min_timestep} onChange={(e) => set("min_timestep", parseInt(e.target.value) || 0)} />
          </Field>
          <Field label="Max Timestep">
            <input type="number" className={inputCls} value={args.max_timestep} onChange={(e) => set("max_timestep", parseInt(e.target.value) || 1000)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sampling">
            <input className={inputCls} value={args.timestep_sampling} onChange={(e) => set("timestep_sampling", e.target.value)} />
          </Field>
          <Field label="Flow Shift">
            <input type="number" step="0.1" className={inputCls} value={args.discrete_flow_shift} onChange={(e) => set("discrete_flow_shift", parseFloat(e.target.value) || 5.0)} />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={args.preserve_distribution_shape} onChange={(e) => set("preserve_distribution_shape", e.target.checked)} className="accent-accent" />
          Preserve Distribution Shape
        </label>
      </Section>

      <Section title="Optimizer">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Optimizer">
            <select className={inputCls} value={args.optimizer_type} onChange={(e) => set("optimizer_type", e.target.value)}>
              <option value="adamw8bit">AdamW 8-bit</option>
              <option value="adamw">AdamW</option>
              <option value="prodigy">Prodigy</option>
            </select>
          </Field>
          <Field label="Learning Rate">
            <input type="number" step="0.00001" className={inputCls} value={args.learning_rate} onChange={(e) => set("learning_rate", parseFloat(e.target.value) || 2e-4)} />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="LR Scheduler">
            <select className={inputCls} value={args.lr_scheduler} onChange={(e) => set("lr_scheduler", e.target.value)}>
              <option value="cosine">Cosine</option>
              <option value="constant">Constant</option>
              <option value="linear">Linear</option>
            </select>
          </Field>
          <Field label="Epochs">
            <input type="number" className={inputCls} value={args.max_train_epochs} onChange={(e) => set("max_train_epochs", parseInt(e.target.value) || 20)} />
          </Field>
          <Field label="Save Every N">
            <input type="number" className={inputCls} value={args.save_every_n_epochs} onChange={(e) => set("save_every_n_epochs", parseInt(e.target.value) || 2)} />
          </Field>
        </div>
      </Section>

      <Section title="Memory">
        <Field label="Blocks to Swap">
          <input type="number" className={inputCls} value={args.blocks_to_swap} onChange={(e) => set("blocks_to_swap", parseInt(e.target.value) || 20)} />
        </Field>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={args.fp8_base} onChange={(e) => set("fp8_base", e.target.checked)} className="accent-accent" />
            FP8 Base
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={args.fp8_scaled} onChange={(e) => set("fp8_scaled", e.target.checked)} className="accent-accent" />
            FP8 Scaled
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={args.gradient_checkpointing} onChange={(e) => set("gradient_checkpointing", e.target.checked)} className="accent-accent" />
            Gradient Checkpointing
          </label>
        </div>
      </Section>

      <Section title="Output">
        <Field label="Output Directory">
          <input className={inputCls} value={args.output_dir} onChange={(e) => set("output_dir", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Output Name">
            <input className={inputCls} value={args.output_name} onChange={(e) => set("output_name", e.target.value)} />
          </Field>
          <Field label="Seed">
            <input type="number" className={inputCls} value={args.seed} onChange={(e) => set("seed", parseInt(e.target.value) || 42)} />
          </Field>
        </div>
        <Field label="Logging Directory">
          <input className={inputCls} value={args.logging_dir} onChange={(e) => set("logging_dir", e.target.value)} />
        </Field>
      </Section>
    </div>
  );
}
