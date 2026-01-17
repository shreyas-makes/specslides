# frozen_string_literal: true

class Story < ApplicationRecord
  validates :title, presence: true
  validates :slug, presence: true, uniqueness: true
  validates :markdown, presence: true

  before_validation :ensure_title
  before_validation :ensure_slug

  def self.extract_title(markdown)
    return nil if markdown.blank?

    line = markdown.lines.find { |l| l.start_with?("# ") }
    line&.sub("# ", "")&.strip
  end

  private

  def ensure_title
    self.title = self.class.extract_title(markdown) if title.blank?
    self.title = "Untitled Specslides" if title.blank?
  end

  def ensure_slug
    return if slug.present?

    10.times do
      candidate = SecureRandom.alphanumeric(8).downcase
      unless self.class.exists?(slug: candidate)
        self.slug = candidate
        break
      end
    end

    self.slug ||= SecureRandom.alphanumeric(10).downcase
  end
end
