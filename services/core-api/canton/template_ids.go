package canton

import "os"

// PropertyNFTTemplateIDFromEnv returns the qualified PropertyNFT template id.
func PropertyNFTTemplateIDFromEnv() string {
	templateID := os.Getenv("CANTON_TEMPLATE_PROPERTY_NFT")
	if templateID == "" {
		templateID = "RentyVest.PropertyNFT:PropertyNFT"
	}
	return QualifyTemplateID(PackageIDFromEnv(), templateID)
}
